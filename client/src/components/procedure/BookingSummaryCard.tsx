/**
 * Booking Summary Card Component
 * Shows summary of 2-stage booking
 */

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, Building2, User, Stethoscope, Calendar, FileText } from 'lucide-react';
import type { Doctor, Machine, Room } from '../../types/booking';

interface BookingSummaryCardProps {
  selectedDoctor: Doctor | null;
  selectedMachine: Machine | null;
  selectedRoom: Room | null;
  selectedPrepRoom: Room | null;
  selectedDate: string;
  prepStartTime: string;
  prepEndTime: string;
  startTime: string;
  endTime: string;
  patientName: string;
  patientHN: string;
  notes?: string;
  createdBy?: string;
  selectedProcedures?: any[];
  requiresPrepRoom: boolean;
  isThreeStage?: boolean;
  threeStageTimes?: any;
  selectedConsultRoom?: Room | null;
  isConsultOnly?: boolean;
  isPrepRoomOnly?: boolean;
}

export function BookingSummaryCard({
  selectedDoctor,
  selectedMachine,
  selectedRoom,
  selectedPrepRoom,
  selectedDate,
  prepStartTime,
  prepEndTime,
  startTime,
  endTime,
  patientName,
  patientHN,
  notes,
  createdBy,
  selectedProcedures = [],
  requiresPrepRoom,
  isThreeStage = false,
  threeStageTimes,
  selectedConsultRoom,
  isConsultOnly = false,
  isPrepRoomOnly = false
}: BookingSummaryCardProps) {
  // Check required fields (room is mandatory, machine is optional for consultation bookings)
  // Check required fields (one of the rooms is mandatory, machine is optional for consultation bookings)
  const room = isPrepRoomOnly ? selectedPrepRoom : selectedRoom;
  if (!room) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          สรุปการจอง
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patient & Creator */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">ผู้ป่วย</p>
              <p className="text-sm text-muted-foreground truncate max-w-[150px]" title={patientName}>{patientName || '-'}</p>
              {patientHN && (
                <p className="text-xs text-muted-foreground">HN: {patientHN}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-4 h-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">ผู้จอง</p>
              <p className="text-sm text-muted-foreground truncate max-w-[150px]" title={createdBy}>{createdBy || '-'}</p>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">วันที่</p>
            <p className="text-sm text-muted-foreground">
              {new Date(selectedDate).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Stage: ปรึกษา (for 3-stage miraDry only) */}
          {(isThreeStage && threeStageTimes?.consultStartTime && selectedConsultRoom) && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                  ขั้นตอนที่ 1: ปรึกษา
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-medium">
                    {threeStageTimes.consultStartTime} - {threeStageTimes.consultEndTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>{selectedConsultRoom.name}</span>
                </div>
                <p className="text-xs text-amber-600">
                  แพทย์ตรวจและให้คำปรึกษา
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Prep Stage (if required) */}
        {requiresPrepRoom && selectedPrepRoom && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                {isThreeStage ? 'ขั้นตอนที่ 2: เตรียมตัว' : 'ขั้นตอนที่ 1: แปะยาชา'}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{prepStartTime} - {prepEndTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>{selectedPrepRoom.name}</span>
              </div>
              <p className="text-xs text-blue-600">
                {isThreeStage ? 'เตรียมอุปกรณ์และผู้ป่วย' : 'เจ้าหน้าที่แปะยาชาให้ผู้ป่วย'}
              </p>
            </div>
          </div>
        )}

        {/* Stage 2: Prep (for 3-stage - using main room) */}
        {isThreeStage && threeStageTimes && !selectedPrepRoom && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                ขั้นตอนที่ 2: แปะยาชา
              </Badge>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                ✅ แพทย์ว่าง - รับนัดอื่นได้
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{threeStageTimes.prepStartTime} - {threeStageTimes.prepEndTime}</span>
                <span className="text-xs text-green-600 font-medium">(30 นาที)</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>{selectedRoom.name}</span>
              </div>
              <p className="text-xs text-blue-600">
                เจ้าหน้าที่แปะยาชาให้ผู้ป่วย
              </p>
              <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-xs text-green-700 font-medium">
                  💡 แพทย์สามารถรับนัดหมายอื่นได้ในช่วงนี้ (หัตถการที่ใช้เวลา ≤ 30 นาที)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Treatment Stage */}
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              {isConsultOnly ? 'ให้คำปรึกษา' : (isThreeStage ? 'ขั้นตอนที่ 3: ทำหัตถการ' : (requiresPrepRoom ? 'ขั้นตอนที่ 2: ทำหัตถการ' : 'ทำหัตถการ'))}
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="font-medium">
                {isThreeStage && threeStageTimes ? threeStageTimes.treatmentStartTime : (requiresPrepRoom ? prepEndTime : startTime)} - {endTime}
              </span>
            </div>
            {selectedDoctor && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-green-600" />
                <span>{selectedDoctor.name}</span>
              </div>
            )}
            {!selectedDoctor && (
              <div className="flex items-center gap-2 opacity-60">
                <User className="w-4 h-4 text-green-600" />
                <span>-</span>
              </div>
            )}
            {selectedMachine && (
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-green-600" />
                <span>{selectedMachine.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-green-600" />
              <span>{room.name}</span>
            </div>

            {/* Procedures List */}
            {selectedProcedures.length > 0 && (
              <div className="pt-2 mt-2 border-t border-green-200/50">
                <p className="text-[10px] uppercase font-bold text-green-700 mb-1">รายการหัตถการ</p>
                <div className="flex flex-wrap gap-1">
                  {selectedProcedures.map((proc, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-white/50 text-green-800 text-[10px] py-0">
                      {proc.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
            <div className="w-4 h-4 mt-1 flex-shrink-0">
              <svg className="w-full h-full text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">บันทึกเพิ่มเติม</p>
              <p className="text-xs italic">{notes}</p>
            </div>
          </div>
        )}

        {/* Total Duration */}
        <div className="pt-3 border-t">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">เวลารวมทั้งหมด:</span>
            <span className="font-bold text-primary">
              {isThreeStage && threeStageTimes ? (threeStageTimes.consultStartTime || threeStageTimes.prepStartTime) : (requiresPrepRoom ? prepStartTime : startTime)} - {endTime}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
