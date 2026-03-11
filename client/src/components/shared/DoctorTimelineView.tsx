import {
  Calendar as CalendarIcon,
  MoreVertical,
  Building2,
  User,
  Cpu,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { isStaffOnlyProcedureName } from "../../constants/sharedBookingRules";
import { getAppointmentColor } from "../../utils/appointmentColors";
import type { Appointment } from "../../types/appointment";
import type { RefObject } from "react";

// Re-export for backward compatibility
export type { Appointment } from "../../types/appointment";

interface DoctorTimelineViewProps {
  currentDate: Date;
  appointments: Appointment[];
  thaiDaysShort: string[];
  thaiMonths: string[];
  onDateClick: () => void;
  onAppointmentClick: (apt: Appointment, e: React.MouseEvent) => void;
  onDetailOpen: (apt: Appointment) => void;
  getUserInitials: (name: string) => string;
  // Drag & drop
  draggedAppointment?: Appointment | null;
  isProcessing?: boolean;
  onDragStart?: (e: React.DragEvent, apt: Appointment) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent, hour?: number, minute?: number) => void;
  onDrop?: (e: React.DragEvent, targetHour: number, targetMinute: number) => void;
  dragOverSlot?: { hour: number; minute: number } | null;
  scrollContainerRef?: RefObject<HTMLDivElement>;
}

// Gradient left-border colors: warm gold → teal (ไล่สีจากซ้ายไปขวา)
const CARD_BORDER_COLORS = [
  '#c8a96e', // warm gold
  '#b8976a', // muted gold
  '#9aab8e', // olive
  '#7dbbb0', // sage teal
  '#5cb8b2', // medium teal
  '#3aada8', // teal
  '#2a9d8f', // deep teal
  '#1a8a7e', // dark teal
];

const DOCTOR_AVATAR_COLORS = [
  '#c8a96e',
  '#b8976a',
  '#9aab8e',
  '#7dbbb0',
  '#5cb8b2',
  '#3aada8',
  '#2a9d8f',
  '#1a8a7e',
];

function getCardBorderColor(index: number, total: number) {
  if (total <= 1) return CARD_BORDER_COLORS[0];
  const ratio = index / (total - 1);
  const colorIdx = Math.round(ratio * (CARD_BORDER_COLORS.length - 1));
  return CARD_BORDER_COLORS[colorIdx];
}

function getAvatarColor(index: number, total: number) {
  if (total <= 1) return DOCTOR_AVATAR_COLORS[0];
  const ratio = index / (total - 1);
  const colorIdx = Math.round(ratio * (DOCTOR_AVATAR_COLORS.length - 1));
  return DOCTOR_AVATAR_COLORS[colorIdx];
}

export function DoctorTimelineView({
  currentDate,
  appointments,
  thaiDaysShort,
  thaiMonths,
  onDateClick,
  onAppointmentClick,
  onDetailOpen,
  getUserInitials,
  draggedAppointment,
  isProcessing,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  dragOverSlot,
  scrollContainerRef,
}: DoctorTimelineViewProps) {
  const isDragging = !!draggedAppointment;
  const HOUR_HEIGHT_NORMAL = 80;
  const HOUR_HEIGHT_DRAG = 128; // 4 slots * 32px when dragging
  const HOUR_HEIGHT = isDragging ? HOUR_HEIGHT_DRAG : HOUR_HEIGHT_NORMAL;
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  // Filter appointments for current date
  const dayAppointments = appointments.filter((apt) => {
    return (
      apt.date.getFullYear() === currentDate.getFullYear() &&
      apt.date.getMonth() === currentDate.getMonth() &&
      apt.date.getDate() === currentDate.getDate()
    );
  });

  // Constants for pixel calculations
  const PX_PER_MIN = HOUR_HEIGHT / 60;
  const GRID_START_HOUR = 8;

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return (h - GRID_START_HOUR) * 60 + m;
  };

  // Get overall time range for an appointment (earliest start to latest end)
  const getTimeRange = (apt: Appointment) => {
    const times: string[] = [];
    if (apt.consultStartTime) times.push(apt.consultStartTime);
    if (apt.prepStartTime) times.push(apt.prepStartTime);
    times.push(apt.startTime);

    const endTimes: string[] = [];
    if (apt.consultEndTime) endTimes.push(apt.consultEndTime);
    if (apt.prepEndTime) endTimes.push(apt.prepEndTime);
    endTimes.push(apt.endTime);

    const earliest = times.sort()[0];
    const latest = endTimes.sort().reverse()[0];
    return { start: earliest, end: latest };
  };

  // Group appointments by doctor
  const doctorMap = new Map<string, Appointment[]>();
  dayAppointments.forEach((apt) => {
    const key = apt.doctor || 'ไม่ระบุแพทย์';
    if (!doctorMap.has(key)) {
      doctorMap.set(key, []);
    }
    doctorMap.get(key)!.push(apt);
  });

  const doctors = Array.from(doctorMap.keys()).sort();

  // Build segments for each appointment
  const buildSegments = (apt: Appointment) => {
    const segments: Array<{
      type: string;
      start: string;
      end: string;
      treatmentStartTime: string;
      label: string;
      isBusy: boolean;
      className?: string;
    }> = [];

    const isMiraDry = apt.procedures?.some((p: any) => {
      const name = p.name.toLowerCase();
      return !name.includes('f/u') && name.includes('miradry');
    });
    const ultheraProc = apt.procedures?.find((p: any) => p.name.toLowerCase().includes('ulthera'));
    const isUlthera = !!ultheraProc;
    const beardLaserProc = apt.procedures?.find((p: any) => p.name.includes('เลเซอร์เครา'));
    const isBeardLaser = !!beardLaserProc;

    // 1. Consult Segment
    if (apt.consultStartTime && apt.consultEndTime) {
      segments.push({
        type: 'CONSULT',
        start: apt.consultStartTime,
        end: apt.consultEndTime,
        treatmentStartTime: apt.treatmentStartTime || apt.startTime,
        label: 'ปรึกษา',
        isBusy: true,
        className: "inline-flex items-center justify-center rounded-md border px-2 py-0.5 font-medium w-fit whitespace-nowrap shrink-0 bg-amber-100 text-amber-700 border-amber-200 text-xs",
      });
    }

    // 2. Prep Segment (General)
    if (apt.prepStartTime && apt.prepEndTime && !isMiraDry) {
      segments.push({
        type: 'PREP',
        start: apt.prepStartTime,
        end: apt.prepEndTime,
        treatmentStartTime: apt.treatmentStartTime || apt.startTime,
        label: 'จนท.แปะยาชา',
        isBusy: false,
      });
    }

    // 3. Treatment Segment
    if (isMiraDry) {
      // MiraDry Stage 2: Prep (Manual recalculation to fix gaps)
      // If there's no consult, we use prepStartTime or just startTime
      const miraPrepStart = (apt.consultStartTime && apt.consultEndTime) ? apt.consultEndTime : (apt.prepStartTime || apt.startTime);
      const miraPrepEnd = apt.startTime;

      if (miraPrepStart < miraPrepEnd) {
        segments.push({
          type: 'PREP',
          start: miraPrepStart,
          end: miraPrepEnd,
          treatmentStartTime: apt.treatmentStartTime || apt.startTime,
          label: 'จนท.ทำหัตถการ',
          isBusy: false,
        });
      }

      // MiraDry Stage 3: Treatment Busy (Doctor needed)
      const treatmentStart = apt.startTime;
      const [h, m] = treatmentStart.split(':').map(Number);
      const startTotal = h * 60 + m;
      const busyEndTotal = startTotal + 30; // MiraDry specific
      const busyEndH = Math.floor(busyEndTotal / 60);
      const busyEndM = busyEndTotal % 60;
      const doctorBusyEndTime = `${busyEndH.toString().padStart(2, '0')}:${busyEndM.toString().padStart(2, '0')}`;

      segments.push({
        type: 'TREATMENT_BUSY',
        start: treatmentStart,
        end: doctorBusyEndTime,
        treatmentStartTime: apt.treatmentStartTime || treatmentStart,
        label: 'หมอ ให้ยาชา Miradry',
        isBusy: true,
      });

      // MiraDry Stage 4: Treatment Free (Staff only)
      // MiraDry Stage 4: Treatment Free (Staff only) - Force to end 30 mins after busy end (Making it 16:00 total)
      const [busyH, busyM] = doctorBusyEndTime.split(':').map(Number);
      const freeEndTotal = busyH * 60 + busyM + 30;
      const freeEndH = Math.floor(freeEndTotal / 60);
      const freeEndM = freeEndTotal % 60;
      const miraFinalEndTime = `${freeEndH.toString().padStart(2, '0')}:${freeEndM.toString().padStart(2, '0')}`;

      segments.push({
        type: 'TREATMENT_FREE',
        start: doctorBusyEndTime,
        end: miraFinalEndTime,
        treatmentStartTime: apt.treatmentStartTime || doctorBusyEndTime,
        label: 'จนท.ทำ Miradry',
        isBusy: false,
      });
    } else {
      // Check if this is a staff-only procedure or machine
      const isStaffOnly = (apt.procedure && isStaffOnlyProcedureName(apt.procedure)) || 
                         (apt.machine && isStaffOnlyProcedureName(apt.machine));
      
      segments.push({
        type: apt.isConsultOnly ? 'CONSULT' : 'TREATMENT',
        start: apt.startTime,
        end: apt.endTime,
        treatmentStartTime: apt.treatmentStartTime || apt.startTime,
        label: apt.isConsultOnly 
          ? 'ปรึกษาแพทย์' 
          : (isUlthera 
            ? `หมอ ${ultheraProc.name}` 
            : (isBeardLaser 
              ? `หมอ ${beardLaserProc.name}` 
              : (apt.procedure 
                ? (isStaffOnly 
                  ? `จนท. ${apt.procedure}` 
                  : (apt.procedure.startsWith('หมอ') 
                    ? apt.procedure 
                    : `หมอ ${apt.procedure}`)) 
                : 'Treatment'))),
        isBusy: true,
        className: apt.isConsultOnly ? "text-xs bg-[#c5a059] text-white" : undefined,
      });
    }

    return segments;
  };

  // If no appointments, show empty state
  if (doctors.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {thaiDaysShort[currentDate.getDay()]}
          </div>
          <div className="text-2xl mt-1">
            {currentDate.getDate()} {thaiMonths[currentDate.getMonth()]}{" "}
            {currentDate.getFullYear() + 543}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CalendarIcon className="h-12 w-12 mb-3 opacity-30" />
          <span className="text-base">ไม่มีนัดหมายในวันนี้</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      {/* Day header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="text-sm text-muted-foreground">
          {thaiDaysShort[currentDate.getDay()]}
        </div>
        <div className="text-2xl mt-1">
          {currentDate.getDate()} {thaiMonths[currentDate.getMonth()]}{" "}
          {currentDate.getFullYear() + 543}
        </div>
      </div>

      <div ref={scrollContainerRef} className="overflow-auto max-h-[calc(100vh-280px)]">
        {/* Doctor column headers */}
        <div className="flex border-b border-border sticky top-0 z-20 bg-muted/30">
          <div className="w-20 flex-shrink-0 border-r border-border" />
          {doctors.map((doctorName, docIdx) => {
            const avatarColor = getAvatarColor(docIdx, doctors.length);
            return (
              <div
                key={doctorName}
                className="flex-1 text-center py-3 px-2 border-r border-border last:border-r-0"
                style={{ minWidth: `${Math.max(220, 900 / doctors.length)}px` }}
              >
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: avatarColor }}
                >
                  {getUserInitials(doctorName)}
                </div>
                <div className="font-semibold text-sm truncate">{doctorName}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {doctorMap.get(doctorName)?.length || 0} นัดหมาย
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid with doctor columns */}
        <div className="flex">
          {/* Time labels column */}
          <div className="w-20 flex-shrink-0 border-r border-border select-none">
            {hours.map((hour) => {
              if (isDragging) {
                // Show 15-minute subdivisions when dragging
                return [0, 15, 30, 45].map((minute) => (
                  <div
                    key={`doc-label-${hour}-${minute}`}
                    className={`px-3 text-sm text-muted-foreground ${minute === 0 ? 'border-t border-border' : 'border-t border-dashed border-border/30'}`}
                    style={{ height: '32px', display: 'flex', alignItems: 'center' }}
                  >
                    {minute === 0 ? (
                      <span className="font-medium">{hour}:00</span>
                    ) : (
                      <span className="text-muted-foreground/50 pl-2">:{minute.toString().padStart(2, '0')}</span>
                    )}
                  </div>
                ));
              }
              return (
                <div
                  key={`doc-label-${hour}`}
                  className="py-2 px-3 text-sm text-muted-foreground border-t border-border"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="font-medium">{hour}:00</span>
                </div>
              );
            })}
          </div>

          {/* Doctor columns */}
          {doctors.map((doctorName, docIdx) => {
            const doctorAppointments = doctorMap.get(doctorName) || [];
            const borderColor = getCardBorderColor(docIdx, doctors.length);

            // Calculate overlaps within this doctor's appointments
            const aptsWithLayout = doctorAppointments.map((apt) => {
              const range = getTimeRange(apt);
              const startMin = timeToMinutes(range.start);
              const endMin = timeToMinutes(range.end);
              return { apt, startMin, endMin, column: 0, totalColumns: 1 };
            }).sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

            // Assign columns for overlapping appointments
            const groups: Array<typeof aptsWithLayout> = [];
            aptsWithLayout.forEach((item) => {
              let placed = false;
              for (const group of groups) {
                if (group.some((g) => item.startMin < g.endMin && item.endMin > g.startMin)) {
                  group.push(item);
                  placed = true;
                  break;
                }
              }
              if (!placed) groups.push([item]);
            });
            groups.forEach((group) => {
              const cols: typeof aptsWithLayout = [];
              group.forEach((item) => {
                let col = 0;
                while (col < cols.length && item.startMin < cols[col].endMin) col++;
                item.column = col;
                cols[col] = item;
              });
              const total = cols.length;
              group.forEach((item) => { item.totalColumns = total; });
            });

            return (
              <div
                key={`col-${doctorName}`}
                className="flex-1 relative border-r border-border last:border-r-0"
                style={{ minWidth: `${Math.max(220, 900 / doctors.length)}px` }}
              >
                {/* Grid rows background */}
                {isDragging ? (
                  // Show 15-minute drop zones when dragging
                  hours.flatMap((hour) =>
                    [0, 15, 30, 45].map((minute) => {
                      const isHourStart = minute === 0;
                      const isHovering = dragOverSlot?.hour === hour && dragOverSlot?.minute === minute;
                      return (
                        <div
                          key={`grid-doc-${doctorName}-${hour}-${minute}`}
                          className={`transition-all duration-75 ${isHourStart ? 'border-t border-border' : 'border-t border-dashed border-border/30'}`}
                          style={{
                            height: '32px',
                            backgroundColor: isHovering ? 'rgba(0, 171, 177, 0.3)' : undefined,
                            borderLeft: isHovering ? '4px solid #c5a059' : undefined
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.backgroundColor = 'rgba(0, 171, 177, 0.3)';
                            onDragOver?.(e, hour, minute);
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            onDragOver?.(e, hour, minute);
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '';
                          }}
                          onDrop={(e) => {
                            e.currentTarget.style.backgroundColor = '';
                            onDrop?.(e, hour, minute)
                          }}
                          onClick={onDateClick}
                        />
                      );
                    })
                  )
                ) : (
                  hours.map((hour) => (
                    <div
                      key={`grid-doc-${doctorName}-${hour}`}
                      className="border-t border-border"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      onClick={onDateClick}
                    />
                  ))
                )}

                {/* Appointment cards — white bg, left border color, black text, slot segments */}
                {aptsWithLayout.map(({ apt, startMin, endMin, column, totalColumns }) => {
                  const segments = buildSegments(apt);
                  const CARD_GAP = 4; // gap between stacked cards
                  const topPx = startMin * PX_PER_MIN;
                  const durationPx = (endMin - startMin) * PX_PER_MIN - CARD_GAP;
                  // header(~85) + segments(segments.length * 36) + padding
                  const contentMinHeight = 85 + segments.length * 36 + 8;
                  const heightPx = Math.max(durationPx, contentMinHeight);

                  // Column layout for overlapping
                  const colWidth = 100 / totalColumns;
                  const leftPct = column * colWidth;
                  const gap = totalColumns > 1 ? 3 : 4;

                  // First segment for header display
                  const firstSeg = segments[0];
                  const remainingSegs = segments.slice(1);

                  const isBeingDragged = isDragging && draggedAppointment?.id === apt.id;
                  const shouldPassThrough = isDragging && !isBeingDragged;

                  return (
                    <div
                      key={`doc-card-${apt.id}`}
                      draggable={!isProcessing && !!onDragStart}
                      onDragStart={(e) => onDragStart?.(e, apt)}
                      onDragEnd={(e) => onDragEnd?.(e)}
                      className={`absolute ${isDragging ? '' : 'cursor-grab active:cursor-grabbing'}`}
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        left: `calc(${leftPct}% + ${gap}px)`,
                        width: `calc(${colWidth}% - ${gap * 2}px)`,
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderLeft: `4px solid ${getAppointmentColor(apt)}`,
                        boxShadow: isBeingDragged ? '0 8px 24px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                        zIndex: isBeingDragged ? 30 : 10,
                        transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
                        opacity: isBeingDragged ? 0.5 : shouldPassThrough ? 0.6 : 1,
                        pointerEvents: isDragging ? 'none' : 'auto',
                      }}
                      onMouseEnter={(e) => {
                        if (!isDragging) {
                          (e.currentTarget as HTMLElement).style.transform = 'scale(1.01)';
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                          (e.currentTarget as HTMLElement).style.zIndex = '20';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDragging) {
                          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                          (e.currentTarget as HTMLElement).style.zIndex = '10';
                        }
                      }}
                      onClick={(e) => !isDragging && onAppointmentClick(apt, e)}
                    >
                      {/* Header row: time + first segment badge + ⋮ */}
                      <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid #f0f0f0' }} className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', fontFamily: 'ui-monospace, monospace' }}>
                              {firstSeg ? `${firstSeg.start} - ${firstSeg.end}` : ''}
                            </span>
                            {firstSeg && (
                              firstSeg.type === 'CONSULT' ? (
                                <Badge className={firstSeg.className || "text-xs bg-amber-100 text-amber-700 border-amber-200"}>
                                  {firstSeg.label}
                                </Badge>
                              ) : firstSeg.isBusy ? (
                                <Badge className="text-xs bg-[#800200] text-white animate-badge-pulse">
                                  <Clock className="h-3 w-3 mr-0.5" />
                                  {firstSeg.label}
                                </Badge>
                              ) : (
                                <Badge className="text-xs bg-[#e8d8a1] text-[#002b38] inline-flex items-center gap-1 animate-badge-bounce">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {firstSeg.label}
                                </Badge>
                              )
                            )}
                          </div>
                          {/* Patient row */}
                          <div style={{ marginTop: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }} className="truncate">
                              {apt.patient}
                            </span>
                          </div>
                          {/* Info: doctor, room, machine */}
                          <div style={{ marginTop: '4px' }} className="flex flex-col gap-0.5">
                            {/* 1. Doctor */}
                            <div className="flex items-center gap-1 truncate" style={{ fontSize: '11px', color: '#374151' }}>
                              <User className="h-3 w-3 text-gray-400 shrink-0" />
                              <span className="truncate">{apt.doctor}</span>
                            </div>

                            {/* 2. Machine (ถ้ามี) */}
                            {apt.machine && apt.machine !== 'N/A' && (
                              <div className="flex items-center gap-1 truncate" style={{ fontSize: '11px', color: '#374151' }}>
                                <Cpu className="h-3 w-3 text-gray-400 shrink-0" />
                                <span className="truncate">{apt.machine}</span>
                              </div>
                            )}

                            {/* 3. Consult Room (ถ้ามี) */}
                            {apt.consultRoom && (
                              <div className="flex items-center gap-1 truncate" style={{ fontSize: '11px', color: '#374151' }}>
                                <Building2 className="h-3 w-3 text-secondary shrink-0" />
                                <span className="truncate">{apt.consultRoom}</span>
                              </div>
                            )}

                            {/* 4. Treatment Room (ย้ายมาไว้ล่างสุด) */}
                            <div className="flex items-center gap-1 truncate" style={{ fontSize: '11px', color: '#374151' }}>
                              <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                              <span className="truncate">{apt.room || '-'}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDetailOpen(apt);
                          }}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Remaining segment rows */}
                      {remainingSegs.map((seg, idx) => (
                        <div
                          key={`${apt.id}-seg-${idx}`}
                          className="flex items-center gap-2"
                          style={{
                            padding: '5px 8px',
                            borderBottom: idx < remainingSegs.length - 1 ? '1px solid #f0f0f0' : undefined,
                            fontSize: '12px',
                            color: '#1a1a1a',
                          }}
                        >
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', fontWeight: 500, color: '#374151', whiteSpace: 'nowrap' }}>
                            {seg.start} - {seg.end}
                          </span>
                          {seg.type === 'CONSULT' ? (
                            <Badge className={seg.className || "text-xs bg-[#c5a059] text-white hover:bg-[#c5a059]/90"}>
                              {seg.label}
                            </Badge>
                          ) : seg.isBusy ? (
                            <Badge className="text-xs bg-[#800200] text-white animate-badge-pulse">
                              <Clock className="h-3 w-3 mr-0.5" />
                              {seg.label}
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-[#e8d8a1] text-[#002b38] inline-flex items-center gap-1 animate-badge-bounce">
                              <CheckCircle2 className="h-3 w-3" />
                              {seg.label}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
