/**
 * Prep Room Selector Component
 * For selecting prep room in 2-stage bookings
 */

import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Building2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import type { Room } from '../../types/booking';

interface PrepRoomSelectorProps {
  prepRooms: Room[];
  selectedPrepRoom: Room | null;
  onPrepRoomChange: (roomId: string) => void;
  prepStartTime: string;
  prepEndTime: string;
  disabled?: boolean;
  isPrepRoomOnly?: boolean; // For Tesla Former: use prep room as main treatment room
}

export function PrepRoomSelector({
  prepRooms,
  selectedPrepRoom,
  onPrepRoomChange,
  prepStartTime,
  prepEndTime,
  disabled = false,
  isPrepRoomOnly = false
}: PrepRoomSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="prep-room" className="flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        {isPrepRoomOnly ? 'ห้องทำหัตถการ' : 'ห้องแปะยาชา (Prep Room)'}
      </Label>

      {/* <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          ขั้นตอนที่ 1: แปะยาชา ({prepStartTime} - {prepEndTime})
          <br />
          <span className="text-xs text-blue-600">
            เจ้าหน้าที่จะใช้ห้องนี้สำหรับแปะยาชาให้ผู้ป่วย (หมอยังว่าง)
          </span>
        </AlertDescription>
      </Alert> */}

      <Select
        value={selectedPrepRoom?.id}
        onValueChange={onPrepRoomChange}
        disabled={disabled}
      >
        <SelectTrigger id="prep-room">
          <SelectValue placeholder="เลือกห้องแปะยาชา (L1-L4)" />
        </SelectTrigger>
        <SelectContent>
          {prepRooms.length === 0 ? (
            <SelectItem value="no-rooms" disabled>
              ไม่มีห้องแปะยาชาว่าง
            </SelectItem>
          ) : (
            prepRooms.map((room) => (
              <SelectItem key={room.id} value={room.id} disabled={!room.isAvailable}>
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${room.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className={!room.isAvailable ? 'text-muted-foreground' : ''}>{room.name}</span>
                  </div>
                  {!room.isAvailable && (
                    <span className="text-xs text-gray-500">(ไม่พร้อมใช้งาน)</span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {selectedPrepRoom && (
        <p className="text-xs text-muted-foreground">
          ✓ เลือก: {selectedPrepRoom.name} สำหรับขั้นตอนแปะยาชา
        </p>
      )}
    </div>
  );
}
