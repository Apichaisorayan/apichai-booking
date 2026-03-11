import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import {
  Stethoscope,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Users,
  Loader2
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { usersApi, machinesApi, roomsApi, bookingsApi } from "../../lib/api";
import { toast } from "sonner";
import { GoogleCalendarSync } from "./GoogleCalendarSync";
import { calculateDoctorBusyTime, formatTimeRange } from "../../utils/doctorBusyTime";
import { UserRole } from "../../types/booking";
import { isStaffOnlyProcedureName } from "../../constants/sharedBookingRules";

interface DashboardOverviewProps {
  bookingMode?: 'procedure' | 'meeting';
  onNavigateToCalendar?: () => void;
}

export function DashboardOverview({ bookingMode = 'procedure', onNavigateToCalendar }: DashboardOverviewProps) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Filter data based on booking mode
        const machineCategory = bookingMode === 'procedure' ? 'MEDICAL' : 'MEETING';
        const roomType = bookingMode === 'procedure' ? 'PROCEDURE' : 'MEETING';

        // For meeting mode, don't fetch doctors and machines
        let doctorsData: any[] = [];
        let machinesData: any[] = [];

        if (bookingMode === 'procedure') {
          const [usersData, machinesDataResult] = await Promise.all([
            usersApi.getAll(),
            machinesApi.getAll({ category: machineCategory }),
          ]);
          // Filter only users with role DOCTOR
          doctorsData = (usersData as any[]).filter((user: any) => user.role === 'DOCTOR');
          machinesData = machinesDataResult as any[];
        }

        // For procedure mode, fetch both PROCEDURE and CONSULTATION bookings
        const [roomsData, ...bookingsResults] = await Promise.all([
          roomsApi.getAll({ type: roomType }),
          bookingsApi.getAll({ type: bookingMode === 'procedure' ? 'PROCEDURE' : 'MEETING' }),
          ...(bookingMode === 'procedure' ? [bookingsApi.getAll({ type: 'CONSULTATION' })] : []),
        ]);
        const bookingsData = bookingsResults.flat();

        setDoctors(doctorsData);
        setMachines(machinesData as any[]);
        setRooms(roomsData as any[]);
        setBookings(bookingsData as any[]);
      } catch (error: any) {
        toast.error('ไม่สามารถโหลดข้อมูลได้: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [bookingMode]); // Re-fetch when booking mode changes

  // Get today's bookings from API data (exclude cancelled) - MUST BE BEFORE HELPER FUNCTIONS
  const today = new Date().toISOString().split('T')[0];
  const todayBookingsList = bookings
    .filter((booking: any) => {
      // Basic filters
      if (booking.date !== today || booking.status === 'CANCELLED') return false;

      // Strict mode filter - include CONSULTATION in procedure mode
      if (bookingMode === 'procedure') {
        if (booking.booking_type && booking.booking_type !== 'PROCEDURE' && booking.booking_type !== 'CONSULTATION') return false;
      } else {
        if (booking.booking_type && booking.booking_type !== 'MEETING') return false;
      }

      // Fallback: Infer type if not present (optional, but good for safety)
      // If we are in meeting mode but see doctor/machine assigned, it might be wrong (though backend should handle this)

      return true;
    })
    .map((booking: any) => {
      // Format time to HH:MM
      const formatTime = (time: string) => {
        if (!time) return '';
        return time.substring(0, 5); // Get HH:MM from HH:MM:SS
      };

      // Extract meeting title from notes (format: "ชื่องาน: xxx")
      const meetingTitle = booking.notes?.startsWith('ชื่องาน: ')
        ? booking.notes.replace('ชื่องาน: ', '')
        : booking.patient_name;

      // Calculate doctor busy time based on procedure type
      const doctorBusyTime = calculateDoctorBusyTime({
        procedures: booking.procedures || [],
        consultStartTime: booking.consult_start_time,
        consultEndTime: booking.consult_end_time,
        prepStartTime: booking.prep_start_time,
        prepEndTime: booking.prep_end_time,
        startTime: booking.start_time,
        endTime: booking.end_time,
      });

      // Calculate total time (from earliest to latest)
      const totalStartTime = booking.consult_start_time || booking.prep_start_time || booking.start_time;
      const totalEndTime = booking.end_time;

      // Check if procedure requires doctor
      const procedureName = booking.booking_procedures?.[0]?.procedures?.name || '';
      const machineName = booking.machines?.name || '';

      // Use centralized logic - check both procedure and machine
      let requiresDoctor = !isStaffOnlyProcedureName(procedureName) && !isStaffOnlyProcedureName(machineName);


      const doctorName = requiresDoctor ? (booking.doctors?.name || '-') : '-';

      return {
        id: booking.id,
        patient: booking.patient_name,
        meetingTitle: meetingTitle,
        doctor: doctorName,
        requiresDoctor: requiresDoctor,
        machine: booking.machines?.name || 'N/A',
        room: booking.rooms?.name || 'N/A',
        time: formatTimeRange(totalStartTime, totalEndTime), // Total Time
        doctorTime: formatTimeRange(doctorBusyTime.startTime, doctorBusyTime.endTime), // Doctor Busy Time
        status: booking.status.toLowerCase(),
        createdBy: booking.users?.name || 'ไม่ระบุ', // ผู้จอง
        createdByRole: booking.users?.role || '', // Role ของผู้จอง
      };
    });


  // Helper function to check if resource is currently busy
  const isCurrentlyBusy = (resourceId: string, resourceType: 'doctor' | 'machine' | 'room') => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
    const currentDate = now.toISOString().split('T')[0];

    return todayBookingsList.some((booking: any) => {
      const bookingData = bookings.find((b: any) => b.id === booking.id);
      if (!bookingData || bookingData.date !== currentDate) return false;

      // For doctor: check if currently in BUSY time blocks
      if (resourceType === 'doctor' && bookingData.doctor_id === resourceId) {
        if (!booking.requiresDoctor) return false;

        // Calculate doctor busy time
        const doctorBusyTime = calculateDoctorBusyTime({
          procedures: bookingData.procedures || [],
          consultStartTime: bookingData.consult_start_time,
          consultEndTime: bookingData.consult_end_time,
          prepStartTime: bookingData.prep_start_time,
          prepEndTime: bookingData.prep_end_time,
          startTime: bookingData.start_time,
          endTime: bookingData.end_time,
        });

        // Check if current time is within any busy block
        if (doctorBusyTime.busyBlocks && doctorBusyTime.busyBlocks.length > 0) {
          const isBusy = doctorBusyTime.busyBlocks.some((block: any) => {
            const blockStart = block.start.substring(0, 5) + ':00'; // Normalize to HH:MM:SS
            const blockEnd = block.end.substring(0, 5) + ':00';
            const inBlock = currentTime >= blockStart && currentTime < blockEnd;
            return inBlock;
          });
          return isBusy;
        }

        // Fallback to full time range if no busy blocks
        const startTimeNormalized = doctorBusyTime.startTime.substring(0, 5) + ':00';
        const endTimeNormalized = doctorBusyTime.endTime.substring(0, 5) + ':00';
        return currentTime >= startTimeNormalized && currentTime < endTimeNormalized;
      }

      // For machine and room: check full booking time
      const isBusy =
        (resourceType === 'machine' && bookingData.machine_id === resourceId) ||
        (resourceType === 'room' && bookingData.room_id === resourceId);

      if (!isBusy) {
        // Also check if this is a prep room for this booking
        if (resourceType === 'room' && bookingData.prep_room_id === resourceId) {
          // Check if current time is within prep time
          if (bookingData.prep_start_time && bookingData.prep_end_time) {
            return currentTime >= bookingData.prep_start_time && currentTime < bookingData.prep_end_time;
          }
        }
        // Also check if this is a consult room for this booking
        if (resourceType === 'room' && bookingData.consult_room_id === resourceId) {
          // Check if current time is within consult time
          if (bookingData.consult_start_time && bookingData.consult_end_time) {
            return currentTime >= bookingData.consult_start_time && currentTime < bookingData.consult_end_time;
          }
        }
        return false;
      }

      // Check if current time is within booking time
      return currentTime >= bookingData.start_time && currentTime < bookingData.end_time;
    });
  };

  // Helper function to get next available time
  const getNextAvailableTime = (resourceId: string, resourceType: 'doctor' | 'machine' | 'room') => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
    const currentDate = now.toISOString().split('T')[0];

    const resourceBookings = bookings
      .filter((b: any) => {
        if (b.date !== currentDate || b.status === 'CANCELLED') return false;

        const procedureName = b.booking_procedures?.[0]?.procedures?.name || '';
        const machineName = b.machines?.name || '';

        // Use centralized logic - check both procedure and machine
        const requiresDoctor = !isStaffOnlyProcedureName(procedureName) && !isStaffOnlyProcedureName(machineName);

        return (
          (resourceType === 'doctor' && b.doctor_id === resourceId && requiresDoctor) ||
          (resourceType === 'machine' && b.machine_id === resourceId) ||
          (resourceType === 'room' && (b.room_id === resourceId || b.prep_room_id === resourceId || b.consult_room_id === resourceId))
        );
      })
      .filter((b: any) => {
        // For rooms, check all possible time ranges
        if (resourceType === 'room') {
          if (b.room_id === resourceId) {
            return b.end_time > currentTime;
          }
          if (b.prep_room_id === resourceId && b.prep_end_time) {
            return b.prep_end_time > currentTime;
          }
          if (b.consult_room_id === resourceId && b.consult_end_time) {
            return b.consult_end_time > currentTime;
          }
          return false;
        }
        return b.end_time > currentTime;
      })
      .sort((a: any, b: any) => {
        // Sort by appropriate start time based on resource type
        if (resourceType === 'room') {
          const aStart = a.room_id === resourceId ? a.start_time :
            (a.prep_room_id === resourceId ? a.prep_start_time : a.consult_start_time);
          const bStart = b.room_id === resourceId ? b.start_time :
            (b.prep_room_id === resourceId ? b.prep_start_time : b.consult_start_time);
          return (aStart || '').localeCompare(bStart || '');
        }
        return a.start_time.localeCompare(b.start_time);
      });

    if (resourceBookings.length === 0) return null;

    // For doctor: use busy blocks to find next available time
    if (resourceType === 'doctor') {
      // Collect all busy blocks from all bookings
      const allBusyBlocks: Array<{ start: string; end: string }> = [];

      resourceBookings.forEach((booking: any) => {
        const doctorBusyTime = calculateDoctorBusyTime({
          procedures: booking.procedures || [],
          consultStartTime: booking.consult_start_time,
          consultEndTime: booking.consult_end_time,
          prepStartTime: booking.prep_start_time,
          prepEndTime: booking.prep_end_time,
          startTime: booking.start_time,
          endTime: booking.end_time,
        });

        if (doctorBusyTime.busyBlocks && doctorBusyTime.busyBlocks.length > 0) {
          doctorBusyTime.busyBlocks.forEach((block: any) => {
            allBusyBlocks.push({
              start: block.start.substring(0, 5) + ':00', // Normalize to HH:MM:SS
              end: block.end.substring(0, 5) + ':00'
            });
          });
        } else {
          // Fallback to full time range
          allBusyBlocks.push({
            start: doctorBusyTime.startTime.substring(0, 5) + ':00',
            end: doctorBusyTime.endTime.substring(0, 5) + ':00'
          });
        }
      });

      // Sort busy blocks by start time
      allBusyBlocks.sort((a, b) => a.start.localeCompare(b.start));

      // Find the end time of the last busy block that overlaps with current time
      let nextFreeTime = currentTime;
      for (const block of allBusyBlocks) {
        if (block.start <= nextFreeTime && block.end > nextFreeTime) {
          nextFreeTime = block.end;
        }
      }

      return nextFreeTime.substring(0, 5);
    }

    // For machine and room: find the first gap or return the end time of the last booking
    let nextFreeTime = currentTime;
    for (const booking of resourceBookings) {
      // Get appropriate start and end times based on resource type
      let bookingStart = booking.start_time;
      let bookingEnd = booking.end_time;

      if (resourceType === 'room') {
        if (booking.room_id === resourceId) {
          bookingStart = booking.start_time;
          bookingEnd = booking.end_time;
        } else if (booking.prep_room_id === resourceId) {
          bookingStart = booking.prep_start_time;
          bookingEnd = booking.prep_end_time;
        } else if (booking.consult_room_id === resourceId) {
          bookingStart = booking.consult_start_time;
          bookingEnd = booking.consult_end_time;
        }
      }

      if (bookingStart > nextFreeTime) {
        return bookingStart.substring(0, 5); // Return the gap time
      }
      nextFreeTime = bookingEnd;
    }

    return nextFreeTime.substring(0, 5);
  };

  // Calculate real-time stats
  const doctorsWithStatus = doctors.map((doctor: any) => {
    const isBusy = isCurrentlyBusy(doctor.id, 'doctor');
    const nextAvailable = isBusy ? getNextAvailableTime(doctor.id, 'doctor') : null;

    // Add indeterminate state logic
    let isAvailable = doctor.is_available;

    // If doctor is marked as available but has complex booking patterns, set to indeterminate
    if (doctor.is_available && doctors.length > 0) {
      const doctorBookings = bookings.filter((b: any) =>
        b.doctor_id === doctor.id &&
        b.date === new Date().toISOString().split('T')[0] &&
        b.status !== 'CANCELLED'
      );

      // If doctor has overlapping or complex bookings, set to indeterminate
      if (doctorBookings.length > 1) {
        const hasOverlap = doctorBookings.some((booking1: any, i: number) => {
          return doctorBookings.some((booking2: any, j: number) => {
            if (i === j) return false;
            const start1 = new Date(`${booking1.date}T${booking1.start_time}`);
            const end1 = new Date(`${booking1.date}T${booking1.end_time}`);
            const start2 = new Date(`${booking2.date}T${booking2.start_time}`);
            const end2 = new Date(`${booking2.date}T${booking2.end_time}`);
            return (start1 < end2 && start2 < end1);
          });
        });

        if (hasOverlap) {
          isAvailable = null; // Indeterminate state
        }
      }
    }

    return {
      ...doctor,
      is_available: isAvailable,
      isBusy,
      nextAvailable,
    };
  });

  const machinesWithStatus = machines.map((machine: any) => ({
    ...machine,
    isBusy: isCurrentlyBusy(machine.id, 'machine'),
    nextAvailable: isCurrentlyBusy(machine.id, 'machine') ? getNextAvailableTime(machine.id, 'machine') : null,
  }));

  const roomsWithStatus = rooms.map((room: any) => ({
    ...room,
    isBusy: isCurrentlyBusy(room.id, 'room'),
    nextAvailable: isCurrentlyBusy(room.id, 'room') ? getNextAvailableTime(room.id, 'room') : null,
  }));

  const availableDoctors = doctorsWithStatus.filter((d: any) => d.is_available && !d.isBusy).length;
  const totalDoctors = doctors.length;
  const availableMachines = machinesWithStatus.filter((m: any) => m.is_available && !m.isBusy).length;
  const totalMachines = machines.length;
  const availableRooms = roomsWithStatus.filter((r: any) => r.is_available && !r.isBusy).length;
  const totalRooms = rooms.length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-[#c5a059] text-white hover:bg-[#c5a059]/90">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            ยืนยันแล้ว
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-600 text-white hover:bg-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            เสร็จสิ้น
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-[#e8d8a1] text-[#002b38] hover:bg-[#e8d8a1]/90">
            <Clock className="h-3 w-3 mr-1" />
            กำลังดำเนินการ
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-[#c5a059] text-[#c5a059]">
            <AlertCircle className="h-3 w-3 mr-1" />
            รอยืนยัน
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="border-[#800200] text-[#800200]">
            <XCircle className="h-3 w-3 mr-1" />
            ยกเลิก
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
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
    <div className="space-y-6">
      {/* Google Calendar Sync */}
      <GoogleCalendarSync
        bookingMode={bookingMode}
        onSyncComplete={() => {
          // Refresh bookings after sync with correct filter
          if (bookingMode === 'procedure') {
            Promise.all([
              bookingsApi.getAll({ type: 'PROCEDURE' }),
              bookingsApi.getAll({ type: 'CONSULTATION' }),
            ]).then(([procData, consultData]) => setBookings([...(procData as any[]), ...(consultData as any[])]));
          } else {
            bookingsApi.getAll({ type: 'MEETING' }).then((data) => setBookings(data as any[]));
          }
        }}
      />

      {/* Today's Bookings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="mb-1">การจองวันนี้</h3>
            <p className="text-sm text-muted-foreground">
              รายการจองทั้งหมด {todayBookingsList.length} รายการ
            </p>
          </div>
          <button
            className="text-sm text-[#c5a059] hover:underline transition-colors"
            onClick={onNavigateToCalendar}
          >
            ดูทั้งหมดในปฏิทิน →
          </button>
        </div>

        {todayBookingsList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>ยังไม่มีการจองวันนี้</p>
            <p className="text-sm mt-2">
              {bookingMode === 'procedure'
                ? 'เริ่มสร้างการจองใหม่ได้จากเมนู "จองห้องแพทย์"'
                : 'เริ่มสร้างการจองใหม่ได้จากเมนู "จองห้องประชุม"'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Header */}
            <div className="grid grid-cols-8 gap-4 border-b pb-3 mb-2">
              <div className="text-sm text-muted-foreground">เวลา</div>
              {bookingMode === 'procedure' && (
                <>
                  <div className="text-sm text-muted-foreground">ผู้จอง</div>
                  <div className="text-sm text-muted-foreground">ผู้ป่วย</div>
                  <div className="text-sm text-muted-foreground">หมอ</div>
                  <div className="text-sm text-muted-foreground">เครื่องมือ</div>
                </>
              )}
              {bookingMode === 'meeting' && (
                <>
                  <div className="text-sm text-muted-foreground col-span-3">ชื่องาน</div>
                  <div className="text-sm text-muted-foreground">ผู้จอง</div>
                </>
              )}
              <div className="text-sm text-muted-foreground">ห้อง</div>
              <div className="text-sm text-muted-foreground">เวลาหมอ</div>
              <div className="text-sm text-muted-foreground">สถานะ</div>
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {todayBookingsList.map((booking: any) => (
                <div
                  key={booking.id}
                  className="grid grid-cols-8 gap-4 py-3 hover:bg-muted/50 transition-colors rounded-lg px-2"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{booking.time}</span>
                  </div>
                  {bookingMode === 'procedure' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm truncate">{booking.createdBy || 'ไม่ระบุ'}</span>
                        {booking.createdByRole && (
                          <Badge variant="outline" className="text-xs w-fit">
                            {booking.createdByRole}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm truncate">{booking.patient}</div>
                      <div className="text-sm text-muted-foreground truncate">{booking.doctor}</div>
                      <div className="truncate">
                        <Badge variant="outline" className="text-xs">
                          {booking.machine}
                        </Badge>
                      </div>
                    </>
                  )}
                  {bookingMode === 'meeting' && (
                    <>
                      <div className="text-sm col-span-3 truncate">{booking.meetingTitle}</div>
                      <div className="text-sm text-muted-foreground truncate">{booking.createdBy || booking.patient}</div>
                    </>
                  )}
                  <div className="text-sm text-muted-foreground truncate">{booking.room}</div>
                  <div className="text-sm text-muted-foreground">{booking.doctorTime}</div>
                  <div>{getStatusBadge(booking.status)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Resource Status */}
      <div className={`grid grid-cols-1 gap-6 ${bookingMode === 'procedure' ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
        {/* Show doctors only in procedure mode */}
        {bookingMode === 'procedure' && (
          <Card className="p-6">
            <h4 className="mb-4 text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              สถานะหมอ
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-3xl">{availableDoctors}/{totalDoctors}</span>
                <Badge className="bg-[#c5a059] text-white">พร้อมให้บริการ</Badge>
              </div>
              <Progress value={(availableDoctors / totalDoctors) * 100} className="h-2" />
              <div className="space-y-1">
                {doctors.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">ไม่มีข้อมูลแพทย์</p>
                ) : (
                  doctorsWithStatus.map((doctor: any) => (
                    <div key={doctor.id} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-muted-foreground truncate flex-1">{doctor.name}</span>
                      {!doctor.is_available ? (
                        <Badge variant="destructive" className="text-xs bg-[#800200]">
                          ไม่พร้อมใช้งาน
                        </Badge>
                      ) : doctor.isBusy ? (
                        <Badge variant="destructive" className="text-xs bg-[#800200] animate-badge-pulse">
                          กำลังดำเนินการ
                        </Badge>
                      ) : doctor.is_available === null ? (
                        <Badge variant="outline" className="text-xs animate-pulse inline-flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          กำลังตรวจสอบ
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-[#e8d8a1] text-[#002b38] inline-flex items-center gap-1 animate-badge-bounce">
                          <CheckCircle2 className="h-3 w-3" />
                          ว่าง
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Show machines only in procedure mode */}
        {bookingMode === 'procedure' && (
          <Card className="p-6">
            <h4 className="mb-4 text-muted-foreground flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              สถานะเครื่องมือ
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-3xl">{availableMachines}/{totalMachines}</span>
                <Badge className="bg-[#c5a059] text-white">พร้อมใช้งาน</Badge>
              </div>
              <Progress value={(availableMachines / totalMachines) * 100} className="h-2" />
              <div className="space-y-1">
                {machines.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">ไม่มีข้อมูลเครื่องมือ</p>
                ) : (
                  machinesWithStatus.map((machine: any) => (
                    <div key={machine.id} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-muted-foreground truncate flex-1">{machine.name}</span>
                      {!machine.is_available ? (
                        <Badge variant="destructive" className="text-xs bg-[#800200]">
                          ไม่พร้อมใช้งาน
                        </Badge>
                      ) : machine.isBusy ? (
                        <Badge variant="destructive" className="text-xs bg-[#800200] animate-badge-pulse">
                          กำลังดำเนินการ
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-[#e8d8a1] text-[#002b38] inline-flex items-center gap-1 animate-badge-bounce">
                          <CheckCircle2 className="h-3 w-3" />
                          ว่าง
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Show rooms in both modes */}
        <Card className="p-6">
          <h4 className="mb-4 text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {bookingMode === 'procedure' ? 'สถานะห้อง' : 'สถานะห้องประชุม'}
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-3xl">{availableRooms}/{totalRooms}</span>
              <Badge className="bg-[#c5a059] text-white">พร้อมใช้งาน</Badge>
            </div>
            <Progress value={(availableRooms / totalRooms) * 100} className="h-2" />
            <div className="space-y-1">
              {rooms.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">ไม่มีข้อมูลห้อง</p>
              ) : (
                roomsWithStatus.map((room: any) => (
                  <div key={room.id} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-muted-foreground truncate flex-1">{room.name}</span>
                    {!room.is_available ? (
                      <Badge variant="destructive" className="text-xs bg-[#800200]">
                        ไม่พร้อมใช้งาน
                      </Badge>
                    ) : room.isBusy ? (
                      <Badge variant="destructive" className="text-xs bg-[#800200] animate-badge-pulse">
                        กำลังดำเนินการ
                      </Badge>
                    ) : (
                      <Badge className="text-xs bg-[#e8d8a1] text-[#002b38] inline-flex items-center gap-1 animate-badge-bounce">
                        <CheckCircle2 className="h-3 w-3" />
                        ว่าง
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
