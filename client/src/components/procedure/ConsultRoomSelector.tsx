/**
 * Consult Room Selector Component
 * For selecting consultation room in 3-stage bookings (like miraDry)
 */

import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Building2, Info, User } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import type { Room } from '../../types/booking';

interface ConsultRoomSelectorProps {
    consultRooms: Room[];
    selectedConsultRoom: Room | null;
    onConsultRoomChange: (roomId: string) => void;
    consultStartTime?: string;
    consultEndTime?: string;
    disabled?: boolean;
}

export function ConsultRoomSelector({
    consultRooms,
    selectedConsultRoom,
    onConsultRoomChange,
    consultStartTime,
    consultEndTime,
    disabled = false
}: ConsultRoomSelectorProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor="consult-room" className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                ห้องคุณหมอ (Consult Room)
            </Label>
            <Select
                value={selectedConsultRoom?.id}
                onValueChange={onConsultRoomChange}
                disabled={disabled}
            >
                <SelectTrigger id="consult-room">
                    <SelectValue placeholder="เลือกห้องห้องปรึกษา (C1-C2)" />
                </SelectTrigger>
                <SelectContent>
                    {consultRooms.length === 0 ? (
                        <SelectItem value="no-rooms" disabled>
                            ไม่มีห้องปรึกษาว่าง
                        </SelectItem>
                    ) : (
                        consultRooms.map((room) => (
                            <SelectItem key={room.id} value={room.id} disabled={!room.isAvailable}>
                                <div className="flex items-center justify-between w-full gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${room.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        <span>{room.name}</span>
                                    </div>
                                </div>
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>

            {selectedConsultRoom && (
                <p className="text-xs text-muted-foreground">
                    ✓ เลือก: {selectedConsultRoom.name} สำหรับขั้นตอนปรึกษา
                </p>
            )}
        </div>
    );
}
