import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, CheckCircle2, Loader2, Calendar, Clock } from 'lucide-react';
import { Input } from '../ui/input';
import { transformRooms } from '../../utils/dataTransformers';
import { Room, UserRole } from '../../types/booking';
import { canCreateBooking } from '../../utils/permissions';
import { roomsApi, bookingsApi } from '../../lib/api';
import { NotificationDialog } from '../NotificationDialog';
import { ConfirmDialog } from '../ConfirmDialog';
import type { ApiRoom } from '../../types/api';

interface MeetingBookingSystemProps {
  userRole: UserRole;
}

export function MeetingBookingSystem({ userRole }: MeetingBookingSystemProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [meetingTitle, setMeetingTitle] = useState<string>('');
  const [organizerName, setOrganizerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Dialog states
  const [notificationDialog, setNotificationDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    type: 'success' | 'error' | 'loading';
  }>({
    open: false,
    title: '',
    description: '',
    type: 'success',
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => { },
  });

  const canBook = canCreateBooking(userRole);

  // Fetch meeting rooms
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const roomsData = await roomsApi.getAll({ type: 'MEETING' });

        // Transform meeting rooms
        const transformedRooms = transformRooms(roomsData as ApiRoom[]);
        setRooms(transformedRooms);
      } catch (error: any) {
        setNotificationDialog({
          open: true,
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถโหลดข้อมูลได้: ' + error.message,
          type: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-validate when all required fields are filled
  useEffect(() => {
    const autoValidate = async () => {
      if (selectedRoom && selectedDate && startTime && endTime && meetingTitle && organizerName) {
        try {
          // Check room availability
          const result = await bookingsApi.checkAvailability(
            selectedDate,
            startTime + ':00',
            endTime + ':00'
          ) as any;

          if (result.success) {
            const isRoomAvailable = !result.unavailable.rooms.includes(selectedRoom.id);

            if (isRoomAvailable) {
              setValidationResult({
                success: true,
                message: 'ห้องประชุมพร้อมใช้งาน',
              });
            } else {
              setValidationResult({
                success: false,
                message: 'ห้องประชุมไม่ว่างในช่วงเวลานี้',
              });
            }
          }
        } catch (error: any) {
          const errorMsg = error.message || 'เกิดข้อผิดพลาดในการตรวจสอบ';
          setValidationResult({
            success: false,
            message: errorMsg,
          });
        }
      } else {
        setValidationResult(null);
      }
    };

    autoValidate();
  }, [selectedRoom, selectedDate, startTime, endTime, meetingTitle, organizerName]);

  const handleRoomChange = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId) || null;
    setSelectedRoom(room);
  };

  const handleConfirmBookingClick = () => {
    if (!validationResult?.success) {
      setNotificationDialog({
        open: true,
        title: 'ไม่สามารถจองได้',
        description: 'กรุณาตรวจสอบข้อมูลก่อนยืนยัน',
        type: 'error',
      });
      return;
    }

    if (!selectedRoom || !meetingTitle.trim() || !organizerName.trim()) {
      setNotificationDialog({
        open: true,
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        type: 'error',
      });
      return;
    }

    // Validate time range
    if (startTime && endTime) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;
      
      if (endTotalMinutes <= startTotalMinutes) {
        setNotificationDialog({
          open: true,
          title: 'เวลาไม่ถูกต้อง',
          description: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น',
          type: 'error',
        });
        return;
      }
    }

    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: 'ยืนยันการจองห้องประชุม',
      description: `คุณต้องการจอง ${selectedRoom.name} สำหรับ "${meetingTitle}" ในวันที่ ${selectedDate} เวลา ${startTime}-${endTime} ใช่หรือไม่?`,
      onConfirm: handleConfirmBooking,
    });
  };

  const handleConfirmBooking = async () => {
    try {
      // Create meeting booking
      const bookingData = {
        room_id: selectedRoom!.id,
        patient_name: organizerName, // Use organizer name as patient_name
        date: selectedDate,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        status: 'CONFIRMED',
        notes: `ชื่องาน: ${meetingTitle}`,
        booking_type: 'MEETING', // Add booking type
        // For meeting rooms, we don't need doctor and machine
        // You'll need to handle this in the backend
      };

      // Show loading
      setNotificationDialog({
        open: true,
        title: 'กำลังบันทึก',
        description: 'กรุณารอสักครู่...',
        type: 'loading',
      });

      const result = await bookingsApi.create(bookingData) as any;

      if (result.success === false) {
        const errorMessages = result.errors && result.errors.length > 0
          ? result.errors.join('\n')
          : result.message || 'ไม่สามารถจองได้';

        setNotificationDialog({
          open: true,
          title: 'ไม่สามารถจองได้',
          description: errorMessages,
          type: 'error',
        });

        setValidationResult(null);
        return;
      }

      setNotificationDialog({
        open: true,
        title: 'จองสำเร็จ!',
        description: 'บันทึกข้อมูลเรียบร้อยแล้ว',
        type: 'success',
      });

      // Reset form
      setSelectedRoom(null);
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('10:00');
      setMeetingTitle('');
      setOrganizerName('');
      setValidationResult(null);

      // Refresh rooms
      const roomsData = await roomsApi.getAll({ type: 'MEETING' });
      const refreshedRooms = transformRooms(roomsData as ApiRoom[]);
      setRooms(refreshedRooms);
    } catch (error: any) {
      const errorMsg = error.message || 'ไม่สามารถบันทึกการจองได้';
      setNotificationDialog({
        open: true,
        title: 'เกิดข้อผิดพลาด',
        description: errorMsg,
        type: 'error',
      });

      setValidationResult(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {!canBook && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-sm text-amber-800">คุณมีสิทธิ์ดูข้อมูลเท่านั้น</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลการจอง</CardTitle>
            <CardDescription>กรุณากรอกข้อมูลการจองห้องประชุม</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ชื่องาน */}
            <div className="space-y-2">
              <Label htmlFor="meetingTitle">ชื่องาน</Label>
              <Input
                id="meetingTitle"
                placeholder="กรอกชื่องาน"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                disabled={!canBook}
              />
            </div>

            {/* ผู้จอง */}
            <div className="space-y-2">
              <Label htmlFor="organizerName">ผู้จอง</Label>
              <Input
                id="organizerName"
                placeholder="กรอกชื่อผู้จอง"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                disabled={!canBook}
              />
            </div>

            {/* วันที่ */}
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                วันที่
              </Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={!canBook}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* เวลา */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  เวลาเริ่ม
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    const newStartTime = e.target.value;
                    setStartTime(newStartTime);

                    // Allow end time to be anything as long as it makes sense (or let backend validate)
                    if (newStartTime && (!endTime || endTime <= newStartTime)) {
                      // Optional: could set end time to match start time + 15 mins or something, 
                      // but user requested removal of auto-logic restrictions.
                    }
                  }}
                  disabled={!canBook}
                  min="09:00"
                  max="20:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  เวลาสิ้นสุด
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!canBook}
                  min={startTime}
                  max="21:00"
                />
              </div>
            </div>

            {/* สถานที่ (ห้องประชุม) */}
            <div className="space-y-2">
              <Label htmlFor="room">สถานที่</Label>
              <Select value={selectedRoom?.id} onValueChange={handleRoomChange} disabled={!canBook}>
                <SelectTrigger id="room">
                  <SelectValue placeholder="เลือกห้องประชุม" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.length === 0 ? (
                    <SelectItem value="no-rooms" disabled>
                      ไม่มีห้องประชุมในระบบ
                    </SelectItem>
                  ) : (
                    rooms.map((room: Room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ผลการตรวจสอบ</CardTitle>
            <CardDescription>ระบบจะตรวจสอบความพร้อมของห้องประชุม</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedRoom ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">กรุณาเลือกห้องประชุมเพื่อดูความพร้อม</p>
              </div>
            ) : validationResult?.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-800">{validationResult.message}</p>
                </div>

                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold">สรุปการจอง</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>ชื่องาน: {meetingTitle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>ผู้จอง: {organizerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>ห้อง: {selectedRoom?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>วันที่: {selectedDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>เวลา: {startTime} - {endTime}</span>
                    </div>
                  </div>
                </div>

                <Button onClick={handleConfirmBookingClick} className="w-full" size="lg">
                  ยืนยันการจอง
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Show missing fields warning */}
                {(!selectedRoom || !meetingTitle || !organizerName) && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">กรุณากรอกข้อมูลให้ครบ:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-xs">
                        {!meetingTitle && <li>กรอกชื่องาน</li>}
                        {!organizerName && <li>กรอกชื่อผู้จอง</li>}
                        {!selectedRoom && <li>เลือกห้องประชุม</li>}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Show validation error if exists */}
                {validationResult && !validationResult.success && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm text-red-800">{validationResult.message}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notification Dialog */}
      <NotificationDialog
        open={notificationDialog.open}
        onOpenChange={(open) => setNotificationDialog({ ...notificationDialog, open })}
        title={notificationDialog.title}
        description={notificationDialog.description}
        type={notificationDialog.type}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}
