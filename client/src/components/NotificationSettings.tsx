import { useState } from "react";
import { Settings, Bell, Volume2, VolumeX, Filter, Clock, Archive } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface NotificationSettingsProps {
  trigger?: React.ReactNode;
}

export function NotificationSettings({ trigger }: NotificationSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const [settings, setSettings] = useState({
    soundEnabled: true,
    desktopEnabled: false,
    autoMarkAsRead: false,
    doNotDisturb: false,
    
    notifyBookingCreated: true,
    notifyBookingUpdated: true,
    notifyBookingCancelled: true,
    notifyBookingReminder: true,
    notifyUserCreated: true,
    
    refreshInterval: "30",
    autoArchiveDays: "30",
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectChange = (key: keyof typeof settings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#c5a059]" />
            ตั้งค่าการแจ้งเตือน
          </DialogTitle>
          <DialogDescription>
            ปรับแต่งการแจ้งเตือนตามความต้องการของคุณ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#c5a059]" />
              การตั้งค่าทั่วไป
            </h3>
            
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound" className="text-base">เสียงแจ้งเตือน</Label>
                  <p className="text-sm text-muted-foreground">
                    เล่นเสียงเมื่อมีการแจ้งเตือนใหม่
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {settings.soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-[#c5a059]" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    id="sound"
                    checked={settings.soundEnabled}
                    onCheckedChange={() => handleToggle('soundEnabled')}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="desktop" className="text-base">การแจ้งเตือนบนเดสก์ท็อป</Label>
                  <p className="text-sm text-muted-foreground">
                    แสดงการแจ้งเตือนแม้เมื่อไม่ได้เปิดหน้าเว็บ
                  </p>
                </div>
                <Switch
                  id="desktop"
                  checked={settings.desktopEnabled}
                  onCheckedChange={() => handleToggle('desktopEnabled')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoRead" className="text-base">อ่านอัตโนมัติ</Label>
                  <p className="text-sm text-muted-foreground">
                    ทำเครื่องหมายว่าอ่านแล้วเมื่อเปิดดู
                  </p>
                </div>
                <Switch
                  id="autoRead"
                  checked={settings.autoMarkAsRead}
                  onCheckedChange={() => handleToggle('autoMarkAsRead')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dnd" className="text-base flex items-center gap-2">
                    ห้ามรบกวน
                    <Badge variant="secondary" className="text-xs">ใหม่</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    ปิดการแจ้งเตือนชั่วคราว
                  </p>
                </div>
                <Switch
                  id="dnd"
                  checked={settings.doNotDisturb}
                  onCheckedChange={() => handleToggle('doNotDisturb')}
                />
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5 text-[#c5a059]" />
              ประเภทการแจ้งเตือน
            </h3>
            
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="bookingCreated" className="text-base">การจองใหม่</Label>
                  <p className="text-sm text-muted-foreground">
                    เมื่อมีการจองใหม่เข้ามา
                  </p>
                </div>
                <Switch
                  id="bookingCreated"
                  checked={settings.notifyBookingCreated}
                  onCheckedChange={() => handleToggle('notifyBookingCreated')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="bookingUpdated" className="text-base">แก้ไขการจอง</Label>
                  <p className="text-sm text-muted-foreground">
                    เมื่อมีการแก้ไขข้อมูลการจอง
                  </p>
                </div>
                <Switch
                  id="bookingUpdated"
                  checked={settings.notifyBookingUpdated}
                  onCheckedChange={() => handleToggle('notifyBookingUpdated')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="bookingCancelled" className="text-base">ยกเลิกการจอง</Label>
                  <p className="text-sm text-muted-foreground">
                    เมื่อมีการยกเลิกการจอง
                  </p>
                </div>
                <Switch
                  id="bookingCancelled"
                  checked={settings.notifyBookingCancelled}
                  onCheckedChange={() => handleToggle('notifyBookingCancelled')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="bookingReminder" className="text-base">แจ้งเตือนการจอง</Label>
                  <p className="text-sm text-muted-foreground">
                    เตือนก่อนถึงเวลานัดหมาย
                  </p>
                </div>
                <Switch
                  id="bookingReminder"
                  checked={settings.notifyBookingReminder}
                  onCheckedChange={() => handleToggle('notifyBookingReminder')}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="userCreated" className="text-base">ผู้ใช้ใหม่</Label>
                  <p className="text-sm text-muted-foreground">
                    เมื่อมีผู้ใช้ใหม่สมัครเข้าระบบ
                  </p>
                </div>
                <Switch
                  id="userCreated"
                  checked={settings.notifyUserCreated}
                  onCheckedChange={() => handleToggle('notifyUserCreated')}
                />
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#c5a059]" />
              การตั้งค่าขั้นสูง
            </h3>
            
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="refresh" className="text-base">ความถี่ในการอัพเดท</Label>
                  <p className="text-sm text-muted-foreground">
                    ตรวจสอบการแจ้งเตือนใหม่ทุกๆ
                  </p>
                </div>
                <Select
                  value={settings.refreshInterval}
                  onValueChange={(value) => handleSelectChange('refreshInterval', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 วินาที</SelectItem>
                    <SelectItem value="30">30 วินาที</SelectItem>
                    <SelectItem value="60">1 นาที</SelectItem>
                    <SelectItem value="300">5 นาที</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="archive" className="text-base flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    จัดเก็บอัตโนมัติ
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    ย้ายการแจ้งเตือนเก่าไปยังที่เก็บหลังจาก
                  </p>
                </div>
                <Select
                  value={settings.autoArchiveDays}
                  onValueChange={(value) => handleSelectChange('autoArchiveDays', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 วัน</SelectItem>
                    <SelectItem value="14">14 วัน</SelectItem>
                    <SelectItem value="30">30 วัน</SelectItem>
                    <SelectItem value="60">60 วัน</SelectItem>
                    <SelectItem value="never">ไม่จัดเก็บ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            ยกเลิก
          </Button>
          <Button
            className="bg-[#c5a059] hover:bg-[#008a8f]"
            onClick={() => {
              console.log('Settings saved:', settings);
              setIsOpen(false);
            }}
          >
            บันทึกการตั้งค่า
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
