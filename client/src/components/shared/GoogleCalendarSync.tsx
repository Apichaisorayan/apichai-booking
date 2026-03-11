import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Calendar, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { calendarApi } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

interface GoogleCalendarSyncProps {
  onSyncComplete?: () => void;
  bookingMode?: 'procedure' | 'meeting';
}

export function GoogleCalendarSync({ onSyncComplete, bookingMode = 'procedure' }: GoogleCalendarSyncProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState<'all' | 'mine' | 'as-doctor'>('all');
  const [syncStats, setSyncStats] = useState<{
    total: number;
    created: number;
    updated: number;
    recreated: number;
    errors: number;
  } | null>(null);

  // Check if user has Google token stored
  useEffect(() => {
    const token = sessionStorage.getItem('google_calendar_token');
    setIsConnected(!!token);
  }, []);

  // Handle Google OAuth
  const handleConnect = async () => {
    try {
      const data = await calendarApi.getAuthUrl();

      console.log('🔗 OAuth URL data:', data);

      // Store redirect_uri for later use
      const redirectUri = data.redirect_uri || `${window.location.origin}/auth/callback`;

      console.log('🔗 Using redirect URI:', redirectUri);
      console.log('🔗 Current origin:', window.location.origin);

      // Open OAuth popup
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.url,
        'Google Calendar Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        // Verify the message is from our OAuth popup (check for expected message types)
        if (!event.data || !event.data.type) return;
        if (!['google_oauth_success', 'google_oauth_error'].includes(event.data.type)) return;

        if (event.data.type === 'google_oauth_success') {
          const { code } = event.data;

          // Exchange code for tokens (send redirect_uri to backend)
          const tokenData = await calendarApi.exchangeCode(code, redirectUri);

          if (tokenData.success) {
            sessionStorage.setItem('google_calendar_token', tokenData.access_token);
            if (tokenData.refresh_token) {
              sessionStorage.setItem('google_calendar_refresh_token', tokenData.refresh_token);
            }
            setIsConnected(true);
            toast.success('เชื่อมต่อ Google Calendar สำเร็จ!');
            popup?.close();
          } else {
            console.error('Token exchange failed:', tokenData);
            toast.error(`ไม่สามารถเชื่อมต่อ Google Calendar ได้: ${tokenData.error || 'Unknown error'}`);
          }
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
        }
      }, 500);
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    sessionStorage.removeItem('google_calendar_token');
    sessionStorage.removeItem('google_calendar_refresh_token');
    setIsConnected(false);
    setSyncStats(null);
    toast.success('ยกเลิกการเชื่อมต่อ Google Calendar แล้ว');
  };

  // Check token validity on mount
  useEffect(() => {
    const checkToken = async () => {
      const token = sessionStorage.getItem('google_calendar_token');
      if (!token) return;

      // Try to verify token by making a simple API call
      try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // Token is invalid, clear it
          console.log('Token is invalid, clearing...');
          sessionStorage.removeItem('google_calendar_token');
          sessionStorage.removeItem('google_calendar_refresh_token');
          setIsConnected(false);
          toast.error('Google token หมดอายุ กรุณาเชื่อมต่อใหม่');
        }
      } catch (error) {
        console.error('Error checking token:', error);
      }
    };

    if (isConnected) {
      checkToken();
    }
  }, [isConnected]);

  // Sync bookings to Google Calendar
  const handleSync = async () => {
    const token = sessionStorage.getItem('google_calendar_token');
    if (!token) {
      toast.error('กรุณาเชื่อมต่อ Google Calendar ก่อน');
      return;
    }

    setIsSyncing(true);
    try {
      // For procedure mode, sync both PROCEDURE and CONSULTATION bookings
      let syncData;
      if (bookingMode === 'procedure') {
        
        // Sync PROCEDURE bookings
        const procData = await calendarApi.sync(
          token,
          new Date().toISOString().split('T')[0], // Today
          undefined, // endDate
          'PROCEDURE', // Pass booking type to filter
          syncMode, // Pass sync mode
          user?.id // Pass current user ID
        ) as any;

        // Sync CONSULTATION bookings
        const consultData = await calendarApi.sync(
          token,
          new Date().toISOString().split('T')[0], // Today
          undefined, // endDate
          'CONSULTATION', // Pass booking type to filter
          syncMode, // Pass sync mode
          user?.id // Pass current user ID
        ) as any;

        // Combine results
        syncData = {
          success: procData.success && consultData.success,
          total: (procData.total || 0) + (consultData.total || 0),
          created: (procData.created || 0) + (consultData.created || 0),
          updated: (procData.updated || 0) + (consultData.updated || 0),
          recreated: (procData.recreated || 0) + (consultData.recreated || 0),
          errors: (procData.errors || 0) + (consultData.errors || 0),
          message: `Synced ${((procData.created || 0) + (consultData.created || 0))} created, ${((procData.updated || 0) + (consultData.updated || 0))} updated, ${((procData.recreated || 0) + (consultData.recreated || 0))} recreated`
        };
      } else {
        // Meeting mode - sync only MEETING bookings
        const bookingType = 'MEETING';
        
        syncData = await calendarApi.sync(
          token,
          new Date().toISOString().split('T')[0], // Today
          undefined, // endDate
          bookingType, // Pass booking type to filter
          syncMode, // Pass sync mode
          user?.id // Pass current user ID
        ) as any;
      }

      const data = syncData;


      if (data.success) {
        setSyncStats({
          total: data.total || 0,
          created: data.created || 0,
          updated: data.updated || 0,
          recreated: data.recreated || 0,
          errors: data.errors || 0,
        });
        const successCount = (data.created || 0) + (data.updated || 0) + (data.recreated || 0);
        const errorCount = data.errors || 0;
        const modeText = bookingMode === 'procedure' ? 'ห้องหัตถการ' : 'ห้องประชุม';
        
        // แสดง error details ใน console ถ้ามี
        if (errorCount > 0 && data.results) {
          const errorResults = data.results.filter((r: any) => r.status === 'error');
          console.error('❌ Sync errors:', errorResults);
          console.error('Error details:');
          errorResults.forEach((r: any) => {
            console.error(`  - Booking ID ${r.booking_id}: ${r.error}`);
          });
        }
        
        // แสดงข้อความที่ชัดเจนขึ้น
        if (data.total === 0) {
          toast.info(`ไม่มีการนัดหมายที่ต้องซิงค์`);
        } else if (errorCount === 0 && successCount > 0) {
          toast.success(`ซิงค์สำเร็จ ${successCount} รายการ`);
        } else if (errorCount > 0 && successCount > 0) {
          toast.warning(`ซิงค์สำเร็จ ${successCount} รายการ แต่ล้มเหลว ${errorCount} รายการ`);
        } else if (errorCount > 0 && successCount === 0) {
          toast.error(`ซิงค์ล้มเหลว ${errorCount} รายการ`);
        } else {
          toast.info(`ซิงค์เสร็จสิ้น`);
        }
        onSyncComplete?.();
      } else {
        console.error('Sync failed:', data);
        toast.error(data.error || 'ไม่สามารถซิงค์ได้');
      }
    } catch (error: any) {
      console.error('❌ Error syncing:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      
      // Show more detailed error message
      let errorMessage = error.message || 'ไม่สามารถซิงค์ได้';
      
      // Check for common errors
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Google token หมดอายุ กรุณาเชื่อมต่อใหม่';
        // Clear invalid token
        sessionStorage.removeItem('google_calendar_token');
        sessionStorage.removeItem('google_calendar_refresh_token');
        setIsConnected(false);
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        errorMessage = 'ไม่มีสิทธิ์เข้าถึง Google Calendar กรุณาตรวจสอบการอนุญาต';
      } else if (errorMessage.includes('404')) {
        errorMessage = 'ไม่พบ Calendar กรุณาตรวจสอบการตั้งค่า';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorMessage = 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง';
      }
      
      toast.error(`เกิดข้อผิดพลาด: ${errorMessage}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#4285F4]/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#4285F4]" />
            </div>
            <div>
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>
                ซิงค์การนัดหมายไปยัง Google Calendar
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={isConnected ? "default" : "secondary"}
            style={isConnected ? {
              backgroundColor: 'var(--theme-primary)',
              color: 'white',
              transition: 'background-color 0.5s ease'
            } : {}}
          >
            {isConnected ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              เชื่อมต่อบัญชี Google เพื่อซิงค์การนัดหมายอัตโนมัติ
            </p>
            <style>{`
              .theme-primary-button {
                background-color: var(--theme-primary);
                color: white;
                transition: all 0.5s ease;
              }
              .theme-primary-button:hover:not(:disabled) {
                opacity: 0.9;
                transform: scale(1.02);
              }
            `}</style>
            <Button
              onClick={handleConnect}
              className="gap-2 theme-primary-button"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              เชื่อมต่อ Google Calendar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sync Mode Selector */}
            <div className="space-y-2">
              <Label htmlFor="syncMode">โหมดการซิงค์</Label>
              <Select value={syncMode} onValueChange={(value: any) => setSyncMode(value)}>
                <SelectTrigger id="syncMode">
                  <SelectValue placeholder="เลือกโหมดการซิงค์" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">ซิงค์ทั้งหมด</span>
                      <span className="text-xs text-muted-foreground">ซิงค์การจองทั้งหมดใน Dashboard</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mine">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">ซิงค์เฉพาะของฉัน</span>
                      <span className="text-xs text-muted-foreground">ซิงค์เฉพาะการจองที่ฉันสร้าง</span>
                    </div>
                  </SelectItem>
                  {user?.role === 'DOCTOR' && (
                    <SelectItem value="as-doctor">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">ซิงค์เฉพาะที่ฉันเป็นหมอ</span>
                        <span className="text-xs text-muted-foreground">ซิงค์เฉพาะการจองที่ฉันเป็นแพทย์</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Sync Stats */}
            {syncStats && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">ซิงค์แล้ว</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900 mt-1">
                      {(syncStats.created || 0) + (syncStats.updated || 0) + (syncStats.recreated || 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 text-red-700">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">ล้มเหลว</span>
                    </div>
                    <p className="text-2xl font-bold text-red-900 mt-1">
                      {syncStats.errors || 0}
                    </p>
                  </div>
                </div>
                
                {/* แสดงคำอธิบายเพิ่มเติมถ้ามี error */}
                {syncStats.errors > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2 text-amber-800">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium">มีบางรายการที่ซิงค์ไม่สำเร็จ</p>
                        <p className="text-xs mt-1 text-amber-700">
                          เปิด Console (กด F12) เพื่อดูรายละเอียดข้อผิดพลาด
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex-1 gap-2 theme-primary-button"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังซิงค์...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    ซิงค์การนัดหมาย
                  </>
                )}
              </Button>
              <style>{`
                .theme-outline-button {
                  border-color: var(--theme-primary);
                  color: var(--theme-primary);
                  transition: all 0.5s ease;
                }
                .theme-outline-button:hover:not(:disabled) {
                  background-color: var(--theme-primary);
                  color: white;
                }
              `}</style>
              <Button
                onClick={handleDisconnect}
                variant="outline"
                disabled={isSyncing}
                className="gap-2 theme-outline-button"
              >
                ยกเลิกการเชื่อมต่อ
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              การซิงค์จะส่งการนัดหมายที่ยืนยันแล้วไปยัง Google Calendar
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
