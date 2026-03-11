// ============================================
// Shared Booking Form Fields
// Reusable form fields for booking systems
// ============================================

import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Calendar, Clock } from 'lucide-react';
import { BUSINESS_HOURS } from '../../constants/app';

interface DateTimeFieldsProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  disabled?: boolean;
}

export function DateTimeFields({
  selectedDate,
  setSelectedDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  disabled = false,
}: DateTimeFieldsProps) {
  return (
    <>
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
          disabled={disabled}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

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
            onChange={(e) => setStartTime(e.target.value)}
            disabled={disabled}
            min={BUSINESS_HOURS.START}
            max={BUSINESS_HOURS.END}
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
            disabled={disabled}
            min={startTime}
            max={BUSINESS_HOURS.MAX_END}
          />
        </div>
      </div>
    </>
  );
}
