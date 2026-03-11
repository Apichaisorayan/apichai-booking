/**
 * AppointmentDetailDialog
 * 
 * Extracted from AppointmentsCalendar.tsx — shows full booking details
 * in a modal dialog with edit/cancel actions.
 */
import {
  Clock,
  Users,
  Building2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import type { Appointment } from "../../../types/appointment";
import { getUserInitials } from "../../../utils/formatters";
import { isStaffOnlyProcedureName, isThreeStageProcedureName } from "../../../constants/sharedBookingRules";

interface AppointmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  canCancel: boolean;
  isProcessing: boolean;
  onEdit: () => void;
  onCancelRequest: () => void;
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    'CONFIRMED': { label: 'ยืนยันแล้ว', variant: 'default' },
    'COMPLETED': { label: 'เสร็จสิ้น', variant: 'secondary' },
    'CANCELLED': { label: 'ยกเลิก', variant: 'destructive' },
  };
  const statusInfo = statusMap[status.toUpperCase()] || { label: status, variant: 'outline' as const };
  return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
}

export function AppointmentDetailDialog({
  open,
  onOpenChange,
  appointment,
  canCancel,
  isProcessing,
  onEdit,
  onCancelRequest,
}: AppointmentDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex-1">
              <DialogTitle>รายละเอียดการจอง</DialogTitle>
              <DialogDescription>
                ข้อมูลการจองห้องแพทย์และเครื่องมือ
              </DialogDescription>
            </div>
            {appointment && (
              <div className="flex-shrink-0 mt-1">
                {getStatusBadge(appointment.status)}
              </div>
            )}
          </div>
        </DialogHeader>

        {appointment && (
          <div className="space-y-6 py-4">
            {/* Created By Info (ผู้จอง - โดดเด่น) */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                ผู้จอง
              </h3>
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-[#c5a059] flex items-center justify-center text-white font-semibold">
                  {getUserInitials(appointment.createdBy || '')}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-lg">{appointment.createdBy || 'ไม่ระบุ'}</p>
                  {appointment.createdByRole && (
                    <Badge variant="outline" className="text-xs">
                      {appointment.createdByRole}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Booking Details - KEY INFO ONLY */}
            <div className="grid grid-cols-2 gap-4">
              {/* Only show doctor if procedure requires doctor */}
              {appointment.doctor && !isStaffOnlyProcedureName(appointment.procedures?.[0]?.name || '') && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">แพทย์ผู้รักษา</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <Users className="h-4 w-4 text-[#c5a059]" />
                    <span className="font-medium">{appointment.doctor}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground">ชื่อผู้ป่วย</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                  <Users className="h-4 w-4 text-[#e8d8a1]" />
                  <span className="font-medium">{appointment.patient}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">HN</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                  <Users className="h-4 w-4 text-[#e8d8a1]" />
                  <span className="font-medium">{appointment.patient_hn}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">เครื่องมือ</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                  <svg className="h-4 w-4 text-[#c5a059]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <span className="font-medium">{appointment.machine}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">ห้องทำหัตถการ</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                  <Building2 className="h-4 w-4 text-[#c5a059]" />
                  <span className="font-medium">{appointment.room}</span>
                </div>
              </div>

              {(appointment.consultRoom || appointment.consultStartTime) && (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">ห้องปรึกษา</Label>
                    <div className="flex items-center gap-2 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                      <Building2 className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-700">{appointment.consultRoom}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">เวลาปรึกษา</Label>
                    <div className="flex items-center gap-2 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-700">
                        {appointment.consultStartTime} - {appointment.consultEndTime}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {(appointment.prepRoom || appointment.prepStartTime) && (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">ห้องเตรียมตัว/ยาชา</Label>
                    <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-700">
                        {appointment.prepRoom || appointment.room}
                      </span>
                    </div>
                  </div>
                </>
              )}


              <div className="space-y-2">
                <Label className="text-muted-foreground">วันที่</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                  <CalendarIcon className="h-4 w-4 text-[#c5a059]" />
                  <span className="font-medium">
                    {appointment.date.toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {((appointment.procedures && appointment.procedures.length > 0) || appointment.procedure) && (
                <div className="space-y-2 col-span-2">
                  <Label className="text-muted-foreground">หัตถการ</Label>
                  <div className="space-y-2">
                    {appointment.procedures && appointment.procedures.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {appointment.procedures.map((proc, idx) => (
                          <div
                            key={proc.id || idx}
                            className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg cursor-default select-none"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <svg className="h-4 w-4 text-[#c5a059]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="flex justify-between items-center w-full">
                              <span className="font-medium text-sm">{proc.name}</span>
                              {/* <span className="text-[10px] text-muted-foreground">{proc.duration_minutes} นาที</span> */}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : appointment.procedure ? (
                      <div
                        className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="h-4 w-4 text-[#c5a059]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">{appointment.procedure}</span>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/10 rounded-lg border border-dashed text-center">
                        <p className="text-sm text-muted-foreground italic">ไม่มีข้อมูลหัตถการ</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>


            {/* Total Time */}
            <div className="space-y-2 col-span-2">
              <Label className="text-muted-foreground">เวลาทำการรวม (Total Time)</Label>
              <div className="flex items-center gap-2 p-4 bg-[#c5a059]/10 border-l-4 border-[#c5a059] rounded-lg">
                <Clock className="h-5 w-5 text-[#c5a059]" />
                <span className="font-medium text-lg">
                  {/* Show full time range: consult start or prep start (if exists) to treatment end */}
                  {(() => {
                    let displayEndTime = appointment.endTime;
                    const isMiraDry = isThreeStageProcedureName(appointment.machine || '') ||
                      (appointment.procedures && appointment.procedures.some(p => isThreeStageProcedureName(p.name)));

                    if (isMiraDry && appointment.startTime) {
                      const [h, m] = appointment.startTime.split(':').map(Number);
                      const busyEndTotal = h * 60 + m + 30;
                      const freeEndTotal = busyEndTotal + 30; // Total 60 mins from start
                      const endH = Math.floor(freeEndTotal / 60);
                      const endM = freeEndTotal % 60;
                      displayEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                    }

                    const endTimeStr = displayEndTime.substring(0, 5);

                    if (appointment.consultStartTime) {
                      return `${appointment.consultStartTime.substring(0, 5)} - ${endTimeStr}`;
                    } else if (appointment.prepStartTime) {
                      return `${appointment.prepStartTime.substring(0, 5)} - ${endTimeStr}`;
                    } else {
                      return `${appointment.startTime.substring(0, 5)} - ${endTimeStr}`;
                    }
                  })()}
                </span>
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">หมายเหตุ</Label>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm">{appointment.notes}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                {!canCancel && (
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    คุณไม่มีสิทธิ์แก้ไขการจอง
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  ปิด
                </Button>
                {canCancel && appointment.status !== 'CANCELLED' && (
                  <>
                    <Button
                      variant="outline"
                      className="text-[#800200] border-[#800200]"
                      onClick={onCancelRequest}
                      disabled={isProcessing}
                    >
                      ยกเลิกการจอง
                    </Button>
                    <Button
                      className="bg-[#c5a059] hover:bg-[#008a8f]"
                      onClick={onEdit}
                      disabled={isProcessing}
                    >
                      แก้ไขการจอง
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
