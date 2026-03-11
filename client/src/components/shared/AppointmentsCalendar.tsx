import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MoreVertical,
  Loader2,
  Building2,
  CheckCircle2,
  Cpu,
  User,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { bookingsApi, calendarApi } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { UserRole } from "../../types/booking";
import { canCancelBooking, canCreateBooking } from "../../utils/permissions";
import { ConfirmDialog } from "../ConfirmDialog";
import { NotificationDialog } from "../NotificationDialog";
import { DoctorTimelineView } from './DoctorTimelineView';
import type { Appointment } from '../../types/appointment';
import { getUserInitials } from '../../utils/formatters';
import { THAI_MONTHS, THAI_DAYS_SHORT } from '../../utils/formatters';
import { transformBookings } from '../../utils/bookingTransformer';
import { isStaffOnlyProcedureName } from '../../constants/sharedBookingRules';
import { getAppointmentColor } from '../../utils/appointmentColors';
import { AppointmentDetailDialog } from './calendar/AppointmentDetailDialog';
import { useNotificationDialog } from '../../hooks/useNotificationDialog';

type ViewMode = "month" | "week" | "day" | "doctor";

interface AppointmentsCalendarProps {
  onNavigateToBooking?: () => void;
  bookingMode?: 'procedure' | 'meeting';
}

export function AppointmentsCalendar({
  onNavigateToBooking,
  bookingMode = 'procedure'
}: AppointmentsCalendarProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ hour: number; minute: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const notification = useNotificationDialog();

  // Get user role
  const userRole = (user?.role?.toUpperCase() as UserRole) || UserRole.SALES;
  const canCancel = canCancelBooking(userRole);


  // Fetch bookings from API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        const type = bookingMode === 'procedure' ? 'PROCEDURE' : 'MEETING';
        // Fetch both PROCEDURE and CONSULTATION bookings in procedure mode
        const [mainData, ...extraData] = await Promise.all([
          bookingsApi.getAll({ type }),
          ...(bookingMode === 'procedure' ? [bookingsApi.getAll({ type: 'CONSULTATION' })] : []),
        ]);
        const data = [...(mainData as any[]), ...(extraData.flat() as any[])];

        const transformedData = transformBookings(data);
        setAppointments(transformedData);
        console.log('📅 Loaded bookings:', transformedData.length);
      } catch (error: any) {
        console.error('❌ Error loading bookings:', error);
        notification.showError('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลการจองได้: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [bookingMode]);

  // Auto-scroll to date after editing (from BookingSystem)
  useEffect(() => {
    const scrollToDate = sessionStorage.getItem('scrollToDate');
    const scrollToBookingId = sessionStorage.getItem('scrollToBookingId');

    if (scrollToDate) {
      console.log('📍 Auto-scrolling to date:', scrollToDate);
      setCurrentDate(new Date(scrollToDate));
      setViewMode('day');
      sessionStorage.removeItem('scrollToDate');

      // Show success notification if coming from edit
      if (scrollToBookingId) {
        notification.showSuccess('แก้ไขสำเร็จ', 'แก้ไขการจองเรียบร้อยแล้ว และกลับมาที่วันที่จอง');
        sessionStorage.removeItem('scrollToBookingId');
      }
    }
  }, [appointments]); // Run when appointments change (after fetch)

  const thaiMonths = THAI_MONTHS;
  const thaiDaysShort = THAI_DAYS_SHORT;

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      // day and doctor views navigate by day
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      // day and doctor views navigate by day
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Add empty slots to complete the last week
    const remainingDays = 42 - days.length; // 6 rows x 7 days
    for (let i = 0; i < remainingDays; i++) {
      days.push(null);
    }

    return days;
  };

  const getWeekDays = (date: Date) => {
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek;
    const weekStart = new Date(date);
    weekStart.setDate(diff);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt) => {
      return (
        apt.date.getFullYear() === date.getFullYear() &&
        apt.date.getMonth() === date.getMonth() &&
        apt.date.getDate() === date.getDate()
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDate = (date1: Date | null, date2: Date) => {
    if (!date1) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const handleDateClick = () => {
    if (onNavigateToBooking) {
      onNavigateToBooking();
    }
  };

  const handleAppointmentClick = (apt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAppointment(apt);
    setIsDetailDialogOpen(true);
  };

  const refreshAppointments = async () => {
    try {
      const type = bookingMode === 'procedure' ? 'PROCEDURE' : 'MEETING';
      // Fetch both PROCEDURE and CONSULTATION bookings in procedure mode
      const [mainData, ...extraData] = await Promise.all([
        bookingsApi.getAll({ type }),
        ...(bookingMode === 'procedure' ? [bookingsApi.getAll({ type: 'CONSULTATION' })] : []),
      ]);
      const data = [...(mainData as any[]), ...(extraData.flat() as any[])];

      const transformedData = transformBookings(data);
      setAppointments(transformedData);
      console.log('🔄 Refreshed bookings:', transformedData.length);

      // If an appointment is currently selected, update it with the new data
      if (selectedAppointment) {
        const updated = transformedData.find(a => a.id === selectedAppointment.id);
        if (updated) {
          console.log('✨ Updating selected appointment state from refreshed list');
          setSelectedAppointment(updated);
        }
      }
    } catch (error: any) {
      console.error('❌ Error refreshing bookings:', error);
      throw error; // Re-throw to be caught by caller
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedAppointment) return;

    setIsProcessing(true);
    try {
      // Show loading
      notification.showLoading('กำลังยกเลิก', 'กรุณารอสักครู่...');

      // Cancel the booking in the system
      const response = await bookingsApi.cancel(selectedAppointment.id) as any;

      console.log('📋 Cancel response:', response);

      // Delete from Google Calendar if event_id exists and user is connected
      const token = sessionStorage.getItem('google_calendar_token');
      const googleEventId = response.google_event_id;

      if (token && googleEventId) {
        try {
          console.log('🗑️ Deleting Google Calendar event:', googleEventId);
          await calendarApi.deleteEvent(token, googleEventId);
          console.log('✅ Deleted Google Calendar event successfully');
        } catch (calError: any) {
          console.warn('⚠️ Failed to delete Google Calendar event:', calError.message);
          // Don't throw error, we already cancelled the booking successfully
        }
      } else {
        console.log('ℹ️ Skip Google Calendar deletion:', {
          hasToken: !!token,
          hasEventId: !!googleEventId
        });
      }

      // Refresh appointments (cancelled bookings will be filtered out)
      await refreshAppointments();
      setIsCancelDialogOpen(false);
      setIsDetailDialogOpen(false);

      notification.showSuccess('ยกเลิกสำเร็จ', 'ยกเลิกการจองเรียบร้อยแล้ว' + (token && googleEventId ? ' และลบจาก Google Calendar แล้ว' : ''));
    } catch (error: any) {
      notification.showError('เกิดข้อผิดพลาด', 'ไม่สามารถยกเลิกการจองได้: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditBooking = () => {
    if (!selectedAppointment) return;

    // Show loading notification
    notification.showLoading('กำลังโหลด', 'กำลังเตรียมข้อมูลสำหรับแก้ไข...');

    // Save appointment data to sessionStorage
    sessionStorage.setItem('editingBooking', JSON.stringify({
      id: selectedAppointment.id,
      machineId: selectedAppointment.machineId || "",
      doctorId: selectedAppointment.doctorId || "",
      roomId: selectedAppointment.roomId || "",
      prepRoomId: selectedAppointment.prepRoomId || "",
      prepStartTime: selectedAppointment.prepStartTime || "",
      prepEndTime: selectedAppointment.prepEndTime || "",
      startTime: selectedAppointment.startTime || "",
      endTime: selectedAppointment.endTime || "",
      patient: selectedAppointment.patient || "",
      patient_hn: selectedAppointment.patient_hn || "",
      date: selectedAppointment.date.toISOString().split('T')[0],
      notes: selectedAppointment.notes || "",
      status: selectedAppointment.status || "",
      procedures: selectedAppointment.procedures?.map(p => p.id.toString()) || [],
      consultRoomId: selectedAppointment.consultRoomId || "",
      consultStartTime: selectedAppointment.consultStartTime || "",
      consultEndTime: selectedAppointment.consultEndTime || "",
      isConsultOnly: selectedAppointment.isConsultOnly || false,
    }));

    // Close detail dialog
    setIsDetailDialogOpen(false);

    // Small delay to show loading state, then navigate
    setTimeout(() => {
      notification.close();
      if (onNavigateToBooking) {
        onNavigateToBooking();
      }
    }, 500);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, appointment: Appointment) => {
    // Set drag image or effect if needed
    e.dataTransfer.effectAllowed = "move";
    // Make it transparent while dragging
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }

    // Force immediate state update to show 15-minute slots
    // Use requestAnimationFrame to ensure React updates before drag continues
    requestAnimationFrame(() => {
      setDraggedAppointment(appointment);
    });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedAppointment(null);
    setDragOverSlot(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, hour?: number, minute?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Update hover slot for visual feedback
    if (hour !== undefined && minute !== undefined) {
      setDragOverSlot({ hour, minute });
    }

    // 📜 Auto-scroll logic
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();
      const threshold = 60; // pixels from edge to start scrolling
      const scrollSpeed = 15;

      if (e.clientY < rect.top + threshold) {
        // Scroll up
        container.scrollTop -= scrollSpeed;
      } else if (e.clientY > rect.bottom - threshold) {
        // Scroll down
        container.scrollTop += scrollSpeed;
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, targetHour: number, targetMinute: number) => {
    e.preventDefault();
    if (!draggedAppointment) return;

    // Use the earliest display time (consult → prep → treatment) for same-slot check
    const displayStartTime = draggedAppointment.consultStartTime || draggedAppointment.prepStartTime || draggedAppointment.startTime;
    const originalStartHour = parseInt(displayStartTime.split(':')[0]);
    const originalStartMin = parseInt(displayStartTime.split(':')[1]);

    // If dropped on the same time slot, do nothing
    if (originalStartHour === targetHour && originalStartMin === targetMinute) return;

    // Calculate total duration from earliest start to latest end
    const durationMinutes =
      (parseInt(draggedAppointment.endTime.split(':')[0]) * 60 + parseInt(draggedAppointment.endTime.split(':')[1])) -
      (originalStartHour * 60 + originalStartMin);

    // Calculate new start time
    const newStartHour = targetHour;
    const newStartMin = targetMinute;

    const newStartTimeStr = `${newStartHour.toString().padStart(2, '0')}:${newStartMin.toString().padStart(2, '0')}`;

    // Calculate new end time
    const totalNewStartMinutes = newStartHour * 60 + newStartMin;
    const totalNewEndMinutes = totalNewStartMinutes + durationMinutes;

    const newEndHour = Math.floor(totalNewEndMinutes / 60);
    const newEndMin = totalNewEndMinutes % 60;
    const newEndTimeStr = `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`;

    // 🕒 Business Hours Check (08:00 - 21:00)
    if (newStartHour < 8 || newEndHour > 21 || (newEndHour === 21 && newEndMin > 0)) {
      notification.showError('ไม่สามารถย้ายได้', 'เวลาที่เลือกอยู่นอกเวลาทำการ (08:00 - 21:00)');
      setDraggedAppointment(null);
      setDragOverSlot(null);
      return;
    }

    try {
      setIsProcessing(true);
      // Show loading
      notification.showLoading('กำลังตรวจสอบ', 'กำลังตรวจสอบความพร้อม...');

      // Calculate delta shift in minutes
      const deltaMinutes = totalNewStartMinutes - (parseInt(originalStartHour.toString()) * 60 + parseInt(originalStartMin.toString()));

      // Helper to shift a HH:mm time by delta minutes
      const shiftTime = (timeStr?: string) => {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        let total = h * 60 + m + deltaMinutes;
        while (total < 0) total += 1440;
        total %= 1440;
        return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
      };

      // Shifting all segments
      const shiftedStartTime = shiftTime(draggedAppointment.startTime.includes(':') ? draggedAppointment.startTime : undefined); // Treatment start time
      const shiftedEndTime = shiftTime(draggedAppointment.endTime);

      // Now we need to know what the REAL start_time (treatment start) is.
      // Logic: If there's a prepEndTime, treatment starts at prepEndTime.
      // If no prep but there's consultEndTime, treatment starts at consultEndTime.
      // Else, treatment starts at the shifted primary start.
      const shiftedPrepStartTime = shiftTime(draggedAppointment.prepStartTime);
      const shiftedPrepEndTime = shiftTime(draggedAppointment.prepEndTime);
      const shiftedConsultStartTime = shiftTime(draggedAppointment.consultStartTime);
      const shiftedConsultEndTime = shiftTime(draggedAppointment.consultEndTime);

      // The 'start_time' for the API is specifically the Treatment start
      let finalTreatmentStartTime = shiftedStartTime;
      if (shiftedPrepEndTime) finalTreatmentStartTime = shiftedPrepEndTime;
      else if (shiftedConsultEndTime) finalTreatmentStartTime = shiftedConsultEndTime;

      const validationData: any = {
        doctor_id: draggedAppointment.doctorId,
        machine_id: draggedAppointment.machineId,
        room_id: draggedAppointment.roomId,
        date: draggedAppointment.date.toISOString().split('T')[0],
        start_time: finalTreatmentStartTime + ':00',
        end_time: shiftedEndTime + ':00',
        exclude_booking_id: draggedAppointment.id,
        is_consult_only: draggedAppointment.isConsultOnly,
        booking_type: draggedAppointment.isConsultOnly ? 'CONSULTATION' : 'PROCEDURE',
        procedure_ids: draggedAppointment.procedures?.map(p => p.id),
      };

      // Add other stages to validation if they exist
      if (shiftedPrepStartTime && shiftedPrepEndTime) {
        validationData.prep_room_id = draggedAppointment.prepRoomId;
        validationData.prep_start_time = shiftedPrepStartTime + ':00';
        validationData.prep_end_time = shiftedPrepEndTime + ':00';
      }

      if (shiftedConsultStartTime && shiftedConsultEndTime) {
        validationData.consult_room_id = draggedAppointment.consultRoomId;
        validationData.consult_start_time = shiftedConsultStartTime + ':00';
        validationData.consult_end_time = shiftedConsultEndTime + ':00';
      }

      const validationResult = await bookingsApi.validate(validationData) as any;

      if (!validationResult.success) {
        // Show validation errors
        const errorMessage = validationResult.errors?.join('\n') || validationResult.message;
        notification.showError('ไม่สามารถย้ายได้', errorMessage);
        return;
      }

      // If validation passed, proceed with update
      notification.showLoading('กำลังย้ายนัดหมาย', 'กรุณารอสักครู่...');

      const updateData: any = {
        date: draggedAppointment.date.toISOString().split('T')[0],
        start_time: finalTreatmentStartTime + ':00',
        end_time: shiftedEndTime + ':00',
        is_consult_only: draggedAppointment.isConsultOnly,
        booking_type: draggedAppointment.isConsultOnly ? 'CONSULTATION' : 'PROCEDURE',
        procedure_ids: draggedAppointment.procedures?.map(p => p.id),
      };

      if (shiftedPrepStartTime) {
        updateData.prep_start_time = shiftedPrepStartTime + ':00';
        updateData.prep_end_time = shiftedPrepEndTime + ':00';
      }
      if (shiftedConsultStartTime) {
        updateData.consult_start_time = shiftedConsultStartTime + ':00';
        updateData.consult_end_time = shiftedConsultEndTime + ':00';
      }

      await bookingsApi.update(draggedAppointment.id, updateData);

      // Refresh appointments
      await refreshAppointments();

      notification.showSuccess('ย้ายสำเร็จ', `เลื่อนนัดหมายไปที่ ${newStartTimeStr} - ${newEndTimeStr} เรียบร้อยแล้ว`);
    } catch (error: any) {
      console.error('Drag drop error:', error);
      notification.showError('เกิดข้อผิดพลาด', 'ไม่สามารถย้ายนัดหมายได้: ' + error.message);
    } finally {
      setIsProcessing(false);
      setDraggedAppointment(null);
      setDragOverSlot(null);
    }
  };

  const formatDateRange = () => {
    const month = thaiMonths[currentDate.getMonth()];
    const year = currentDate.getFullYear() + 543;

    if (viewMode === "month") {
      return `${month} ${year}`;
    } else if (viewMode === "week") {
      const weekDays = getWeekDays(currentDate);
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} ${month} ${year}`;
      } else {
        return `${start.getDate()} ${thaiMonths[start.getMonth()]} - ${end.getDate()} ${thaiMonths[end.getMonth()]
          } ${year}`;
      }
    } else {
      const day = currentDate.getDate();
      return `${day} ${month} ${year}`;
    }
  };

  const renderMonthView = () => {
    const days = getMonthDays(currentDate);

    return (
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {thaiDaysShort.map((day, index) => (
            <div
              key={index}
              className="p-3 text-center text-sm text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={index}
                  className="min-h-[120px] border-r border-b border-border bg-muted/10"
                />
              );
            }

            const dayAppointments = getAppointmentsForDate(day);
            const isTodayDate = isToday(day);

            return (
              <div
                key={index}
                onClick={handleDateClick}
                className="min-h-[120px] border-r border-b border-border p-2 hover:bg-muted/20 cursor-pointer transition-colors relative group"
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${isTodayDate
                      ? "bg-[#c5a059] text-white"
                      : "text-foreground"
                      }`}
                  >
                    {day.getDate()}
                  </span>

                </div>

                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((apt) => {
                    const color = getAppointmentColor(apt);
                    return (
                      <div
                        key={apt.id}
                        onClick={(e) => handleAppointmentClick(apt, e)}
                        className="text-xs p-1.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: color + "20",
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <div className="truncate font-medium">
                          {apt.consultStartTime || apt.prepStartTime || apt.startTime} {apt.patient}
                        </div>
                        <div className="truncate text-[10px] opacity-75 mt-0.5">
                          {apt.doctor} • {apt.room}
                        </div>
                      </div>
                    );
                  })}
                  {dayAppointments.length > 3 && (
                    <div
                      className="text-xs text-muted-foreground pl-1 cursor-pointer hover:text-[#c5a059] hover:underline transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentDate(day);
                        setViewMode("day");
                      }}
                    >
                      +{dayAppointments.length - 3} เพิ่มเติม
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

    return (
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {/* Week header */}
        <div className="grid grid-cols-8 border-b border-border">
          <div className="p-3 border-r border-border bg-muted/30" />
          {weekDays.map((day, index) => {
            const isTodayDate = isToday(day);
            return (
              <div
                key={index}
                className="p-3 text-center border-r border-border last:border-r-0 bg-muted/30"
              >
                <div className="text-xs text-muted-foreground">
                  {thaiDaysShort[day.getDay()]}
                </div>
                <div
                  className={`text-lg mt-1 ${isTodayDate ? "text-[#c5a059]" : ""
                    }`}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Week grid */}
        <div ref={scrollContainerRef} className="overflow-auto max-h-[calc(100vh-280px)]">
          <div className="grid grid-cols-8">
            {/* Time column */}
            <div className="bg-muted/10 border-r border-border">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-20 border-b border-border px-2 py-1 text-xs text-muted-foreground"
                >
                  {hour}:00
                </div>
              ))}
            </div>

            {/* Days columns */}
            {weekDays.map((day, dayIndex) => {
              const dayAppointments = getAppointmentsForDate(day);
              return (
                <div key={dayIndex} className="border-r border-border last:border-r-0">
                  {hours.map((hour) => {
                    const hourAppointments = dayAppointments.filter((apt) => {
                      // Use earliest display time for filtering
                      const displayStartTime = apt.consultStartTime || apt.prepStartTime || apt.startTime;
                      const aptHour = parseInt(displayStartTime.split(":")[0]);
                      return aptHour === hour;
                    });

                    return (
                      <div
                        key={hour}
                        onClick={handleDateClick}
                        className="h-20 border-b border-border hover:bg-muted/20 cursor-pointer transition-colors p-1 relative overflow-hidden"
                      >
                        <div className="flex gap-1 h-full">
                          {hourAppointments.map((apt) => {
                            const color = getAppointmentColor(apt);
                            return (
                              <div
                                key={apt.id}
                                onClick={(e) => handleAppointmentClick(apt, e)}
                                className="flex-1 p-1.5 rounded text-xs overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                style={{
                                  backgroundColor: color + "20",
                                  borderLeft: `3px solid ${color}`,
                                  minWidth: hourAppointments.length > 1 ? '0' : 'auto',
                                }}
                              >
                                <div className="truncate font-medium text-[10px]">{apt.createdBy || 'ไม่ระบุ'}</div>
                                <div className="text-[9px] opacity-75 truncate">
                                  แพทย์: {apt.doctor}
                                </div>
                                <div className="text-[9px] opacity-75 truncate">
                                  ห้อง: {apt.room}
                                </div>
                                <div className="text-[9px] opacity-75 truncate">
                                  {apt.startTime}-{apt.endTime}
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
    const dayAppointments = getAppointmentsForDate(currentDate);
    const isDragging = !!draggedAppointment;

    // Constants for pixel calculations
    const HOUR_HEIGHT = isDragging ? 128 : 80; // px per hour (4 slots * 32px when dragging, else 80px)
    const PX_PER_MIN = HOUR_HEIGHT / 60;
    const GRID_START_HOUR = 8; // Grid starts at 8:00

    // Helper to convert "HH:MM" → minutes from grid start
    const timeToMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return (h - GRID_START_HOUR) * 60 + m;
    };

    // Create time slots - show 15-minute subdivisions only when dragging
    const timeSlots: { hour: number; minute: number }[] = [];
    hours.forEach((hour) => {
      timeSlots.push({ hour, minute: 0 });
      if (draggedAppointment) {
        timeSlots.push({ hour, minute: 15 });
        timeSlots.push({ hour, minute: 30 });
        timeSlots.push({ hour, minute: 45 });
      }
    });

    // Build segments for each appointment (same structure as DoctorTimelineView)
    const buildSegments = (apt: any) => {
      const segments: Array<{
        type: string;
        start: string;
        end: string;
        treatmentStartTime: string;
        label: string;
        isBusy: boolean;
        className?: string;
      }> = [];
      const color = getAppointmentColor(apt);
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
          label: 'ปรึกษาแพทย์',
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

        // Only add prep segment if there's actually a gap
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
        const busyEndTotal = startTotal + 30; // MiraDry specific: 30 minutes doctor busy
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

      return { segments, color };
    };

    // Get overall time range for an appointment
    const getTimeRange = (apt: any) => {
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

    // Calculate overlapping appointments and their positions
    const calculateOverlaps = () => {
      const appointmentsWithPosition = dayAppointments.map((apt) => {
        // Get the earliest start time from all segments
        const displayStartTime = apt.consultStartTime || apt.prepStartTime || apt.startTime;
        const startMinutes = timeToMinutes(displayStartTime);
        const endMinutes = timeToMinutes(apt.endTime);

        return {
          appointment: apt,
          startMinutes,
          endMinutes,
          column: 0,
          totalColumns: 1,
        };
      });

      // Sort by start time, then by duration (longer first)
      appointmentsWithPosition.sort((a, b) => {
        if (a.startMinutes !== b.startMinutes) {
          return a.startMinutes - b.startMinutes;
        }
        return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
      });

      // Find overlapping groups (only check different appointments, not segments within same appointment)
      const groups: Array<Array<typeof appointmentsWithPosition[0]>> = [];

      appointmentsWithPosition.forEach((apt) => {
        // Find a group that this appointment overlaps with
        let foundGroup = false;

        for (const group of groups) {
          const overlapsWithGroup = group.some((other) => {
            // Check if they're different appointments and overlap in time
            return other.appointment.id !== apt.appointment.id &&
              apt.startMinutes < other.endMinutes &&
              apt.endMinutes > other.startMinutes;
          });

          if (overlapsWithGroup) {
            group.push(apt);
            foundGroup = true;
            break;
          }
        }

        if (!foundGroup) {
          groups.push([apt]);
        }
      });

      // Assign columns within each group
      groups.forEach((group) => {
        const columns: (typeof appointmentsWithPosition[0])[] = [];

        group.forEach((apt) => {
          // Find the first column where this appointment doesn't overlap
          let columnIndex = 0;

          while (columnIndex < columns.length) {
            const columnApt = columns[columnIndex];
            if (apt.startMinutes >= columnApt.endMinutes) {
              // No overlap, can use this column
              break;
            }
            columnIndex++;
          }

          apt.column = columnIndex;
          columns[columnIndex] = apt;
        });

        // Set total columns for all appointments in this group
        const totalColumns = columns.length;
        group.forEach((apt) => {
          apt.totalColumns = totalColumns;
        });
      });

      return appointmentsWithPosition;
    };

    const appointmentsWithPosition = calculateOverlaps();

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

        {/* Day schedule — grid background + absolute overlay */}
        <div ref={scrollContainerRef} className="overflow-auto max-h-[calc(100vh-280px)]">
          <div className="flex">
            {/* Time labels column */}
            <div className="w-20 flex-shrink-0 border-r border-border select-none">
              {timeSlots.map((slot) => {
                const isHourStart = slot.minute === 0;
                return (
                  <div
                    key={`label-${slot.hour}-${slot.minute}`}
                    className={`py-2 px-3 text-sm text-muted-foreground ${isHourStart ? 'border-t border-border' : 'border-t border-dashed border-border/30'
                      }`}
                    style={{ height: isDragging ? '32px' : (isHourStart ? `${HOUR_HEIGHT}px` : undefined), minHeight: isDragging ? '32px' : undefined }}
                  >
                    {isHourStart ? (
                      <span className="font-medium">{slot.hour}:00</span>
                    ) : (
                      <span className="text-muted-foreground/50 pl-2">:{slot.minute.toString().padStart(2, '0')}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Content area — the grid lines (background) + appointments (overlay) */}
            <div className="flex-1 relative">
              {/* Grid lines background */}
              {timeSlots.map((slot) => {
                const isHourStart = slot.minute === 0;
                const isHovering = dragOverSlot?.hour === slot.hour && dragOverSlot?.minute === slot.minute;

                return (
                  <div
                    key={`grid-${slot.hour}-${slot.minute}`}
                    className={`transition-all duration-75 ${isHourStart ? 'border-t border-border' : 'border-t border-dashed border-border/30'
                      } ${isDragging
                        ? ''
                        : 'hover:bg-muted/20'
                      }`}
                    style={{
                      height: isDragging ? '32px' : (isHourStart ? `${HOUR_HEIGHT}px` : undefined),
                      minHeight: isDragging ? '32px' : undefined,
                      backgroundColor: isHovering ? 'rgba(0, 171, 177, 0.3)' : undefined,
                      borderLeft: isHovering ? '4px solid #c5a059' : undefined
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = 'rgba(0, 171, 177, 0.3)';
                      handleDragOver(e, slot.hour, slot.minute);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      handleDragOver(e, slot.hour, slot.minute);
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '';
                      if (dragOverSlot?.hour === slot.hour && dragOverSlot?.minute === slot.minute) {
                        setDragOverSlot(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.currentTarget.style.backgroundColor = '';
                      handleDrop(e, slot.hour, slot.minute);
                    }}
                  />
                );
              })}

              {/* Appointments overlay — unified cards (same design as Doctor Timeline View) */}
              {appointmentsWithPosition.map(({ appointment: apt, column, totalColumns }) => {
                const { segments, color } = buildSegments(apt);
                if (segments.length === 0) return null;

                // Calculate unified card position from earliest start to latest end
                const range = getTimeRange(apt);
                const startMin = timeToMinutes(range.start);
                const endMin = timeToMinutes(range.end);
                const CARD_GAP = 4; // gap between stacked cards
                const topPx = startMin * PX_PER_MIN;
                const durationPx = (endMin - startMin) * PX_PER_MIN - CARD_GAP;
                // header(~85) + segments(segments.length * 36) + padding
                const contentMinHeight = 85 + segments.length * 36 + 8;
                const heightPx = Math.max(durationPx, contentMinHeight);

                // Column layout for overlapping
                const colWidth = 100 / totalColumns;
                const leftPct = column * colWidth;
                const gap = totalColumns > 1 ? 6 : 8;

                // First segment for header display
                const firstSeg = segments[0];
                const remainingSegs = segments.slice(1);

                const isBeingDragged = isDragging && draggedAppointment?.id === apt.id;
                const shouldPassThrough = isDragging && !isBeingDragged;

                return (
                  <div
                    key={`day-card-${apt.id}`}
                    draggable={!isProcessing && canCreateBooking(userRole)}
                    onDragStart={(e) => handleDragStart(e, apt)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => !isDragging && handleAppointmentClick(apt, e)}
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
                      borderLeft: `4px solid ${color}`,
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
                          setSelectedAppointment(apt);
                          setIsDetailDialogOpen(true);
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
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">กำลังโหลดนัดหมาย...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button onClick={goToToday} variant="outline">
            วันนี้
          </Button>
          <div className="flex items-center gap-1">
            <Button
              onClick={goToPrevious}
              variant="outline"
              size="icon"
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={goToNext}
              variant="outline"
              size="icon"
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl min-w-[200px]">{formatDateRange()}</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
          </div>

          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button
              variant={viewMode === "day" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
              className="rounded-none"
            >
              วัน
            </Button>
            <Button
              variant={viewMode === "doctor" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("doctor")}
              className="rounded-none border-x border-border"
            >
              แพทย์
            </Button>
            <Button
              variant={viewMode === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="rounded-none border-r border-border"
            >
              สัปดาห์
            </Button>
            <Button
              variant={viewMode === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="rounded-none"
            >
              เดือน
            </Button>
          </div>

          <Button
            className="bg-[#c5a059] hover:bg-[#008a8f]"
            onClick={() => onNavigateToBooking && onNavigateToBooking()}
          >
            <Plus className="h-4 w-4 mr-2" />
            สร้างนัดหมาย
          </Button>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === "month" && renderMonthView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "day" && renderDayView()}
      {viewMode === "doctor" && (
        <DoctorTimelineView
          scrollContainerRef={scrollContainerRef}
          currentDate={currentDate}
          appointments={appointments}
          thaiDaysShort={thaiDaysShort}
          thaiMonths={thaiMonths}
          onDateClick={handleDateClick}
          onAppointmentClick={handleAppointmentClick}
          onDetailOpen={(apt) => {
            setSelectedAppointment(apt);
            setIsDetailDialogOpen(true);
          }}
          getUserInitials={getUserInitials}
          draggedAppointment={draggedAppointment}
          isProcessing={isProcessing}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          dragOverSlot={dragOverSlot}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        title="ยืนยันการยกเลิก"
        description={`คุณต้องการยกเลิกการจองของ ${selectedAppointment?.patient} ใช่หรือไม่?`}
        onConfirm={handleCancelBooking}
        confirmText="ยืนยัน"
        cancelText="ยกเลิก"
      />

      {/* Appointment Detail Dialog */}
      <AppointmentDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        appointment={selectedAppointment}
        canCancel={canCancel}
        isProcessing={isProcessing}
        onEdit={handleEditBooking}
        onCancelRequest={() => setIsCancelDialogOpen(true)}
      />

      {/* Notification Dialog */}
      <NotificationDialog
        open={notification.state.open}
        onOpenChange={notification.setOpen}
        title={notification.state.title}
        description={notification.state.description}
        type={notification.state.type}
      />
    </div >
  );
}
