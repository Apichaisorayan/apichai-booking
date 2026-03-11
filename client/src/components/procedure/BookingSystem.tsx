import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { User, Stethoscope, Building2, AlertCircle, CheckCircle2, Loader2, Calendar, Clock, FileText, ChevronDown, ChevronUp, ArrowLeft, Home, Activity, MessageSquare } from 'lucide-react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { transformMachines, transformRooms, transformMachine, transformRoom } from '../../utils/dataTransformers';
import { Doctor, Machine, Room, UserRole, MachineType } from '../../types/booking';
import { canCreateBooking } from '../../utils/permissions';
import { usersApi, machinesApi, roomsApi, bookingsApi } from '../../lib/api';
import { NotificationDialog } from '../NotificationDialog';
import { ConfirmDialog } from '../ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import type { ApiMachine, ApiRoom } from '../../types/api';
import { PrepRoomSelector } from './PrepRoomSelector';
import { ConsultRoomSelector } from './ConsultRoomSelector';
import { BookingSummaryCard } from './BookingSummaryCard';
import { checkRequiresPrepRoom, getMaxPrepDuration, calculatePrepTimes } from '../../utils/prepStageHelper';
import { STAFF_ONLY_KEYWORDS } from '../../constants/booking';
import { checkIfDoctorIsOptional, isThreeStageProcedure, calculateThreeStageTimes } from '../../utils/bookingLogic';
import { isPrepRoomOnlyProcedure, shouldHideConsultRoom } from '../../constants/sharedBookingRules';
import { toTimeWithSeconds } from '../../utils/timeFormat';

interface BookingSystemProps {
  userRole: UserRole;
  onNavigateToCalendar?: () => void; // Callback to navigate back to calendar
}

interface AvailabilityResponse {
  is_available: boolean;
  current_task: {
    start: string;
    end: string;
    room?: string;
    service?: string;
    doctor?: string;
    machine?: string;
  } | null;
  next_available: string | null;
  schedule: Array<{
    start: string;
    end: string;
    room?: string;
    service?: string;
    doctor?: string;
    machine?: string;
  }>;
}

export function BookingSystem({ userRole, onNavigateToCalendar }: BookingSystemProps) {
  const { user } = useAuth(); // ดึงข้อมูล user ที่ login

  // Helper function to get 2-letter initials
  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      // ถ้ามี 2 คำขึ้นไป เอาตัวแรกของแต่ละคำ
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    // ถ้ามีคำเดียว เอา 2 ตัวแรก
    return name.substring(0, 2).toUpperCase();
  };

  // State for editing booking
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [prepRooms, setPrepRooms] = useState<Room[]>([]); // Prep rooms (L1-L4)
  const [treatmentRooms, setTreatmentRooms] = useState<Room[]>([]); // Treatment rooms (TR)
  const [users, setUsers] = useState<any[]>([]); // รายชื่อผู้ใช้ทั้งหมด
  const [procedures, setProcedures] = useState<any[]>([]); // หัตถการที่เกี่ยวข้องกับเครื่องที่เลือก
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<string[]>([]); // หัตถการที่เลือก (หลายรายการ)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedPrepRoom, setSelectedPrepRoom] = useState<Room | null>(null); // Prep room selection
  const [requiresPrepRoom, setRequiresPrepRoom] = useState(false); // Whether selected procedures need prep
  const [isPrepRoomOnly, setIsPrepRoomOnly] = useState(false); // Tesla Former: uses prep room as main room
  const [hideConsultRoom, setHideConsultRoom] = useState(false); // Hide consult room for certain procedures
  const [isThreeStage, setIsThreeStage] = useState(false);
  const [threeStageTimes, setThreeStageTimes] = useState<any>(null);
  const [consultRooms, setConsultRooms] = useState<Room[]>([]);
  const [selectedConsultRoom, setSelectedConsultRoom] = useState<Room | null>(null);
  const [prepDuration, setPrepDuration] = useState(0); // Prep duration in minutes
  const [isConsultOnly, setIsConsultOnly] = useState(false); // Consultation-only booking mode
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('09:00'); // Treatment start time
  const [endTime, setEndTime] = useState<string>('09:30'); // Treatment end time (Default 30 mins)
  const [prepStartTime, setPrepStartTime] = useState<string>(''); // Prep start time
  const [prepEndTime, setPrepEndTime] = useState<string>(''); // Prep end time
  const [patientName, setPatientName] = useState<string>('');
  const [patientHN, setPatientHN] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unavailableResources, setUnavailableResources] = useState<{
    doctors: string[];
    machines: string[];
    rooms: string[];
  }>({ doctors: [], machines: [], rooms: [] });

  // Availability states
  const [doctorAvailability, setDoctorAvailability] = useState<AvailabilityResponse | null>(null);
  const [machineAvailability, setMachineAvailability] = useState<AvailabilityResponse | null>(null);
  const [roomAvailability, setRoomAvailability] = useState<AvailabilityResponse | null>(null);
  const [showDoctorSchedule, setShowDoctorSchedule] = useState(false);
  const [prepRoomAvailability, setPrepRoomAvailability] = useState<AvailabilityResponse | null>(null);
  const [consultRoomAvailability, setConsultRoomAvailability] = useState<AvailabilityResponse | null>(null);

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

  // ✨ Warning dialog for miraDry overlaps
  const [warningDialog, setWarningDialog] = useState<{
    open: boolean;
    warnings: any[];
  }>({
    open: false,
    warnings: [],
  });

  const [forceBooking, setForceBooking] = useState(false); // Flag to force booking despite warnings

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

  // Check if doctor is optional based on machine/procedures
  const isDoctorOptional = checkIfDoctorIsOptional(
    selectedMachine,
    Array.isArray(procedures) ? procedures.filter(p => selectedProcedureIds.includes(p.id)) : []
  );

  // ✨ Auto-clear doctor if it becomes optional (Staff-only procedures)
  useEffect(() => {
    if (isDoctorOptional && selectedDoctor) {
      setSelectedDoctor(null);
    }
  }, [isDoctorOptional, selectedDoctor]);

  // Check if doctor is needed (opposite of optional)
  // In consultation-only mode, doctor is always optional
  const needsDoctor = isConsultOnly ? false : !isDoctorOptional;

  // Generate time slots from 9 AM to 8 PM (every 30 minutes)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Skip if we're at 20:30 or later (stop at 20:00)
        if (hour === 20 && minute > 0) break;

        const startHour = hour;
        const startMinute = minute;
        const endMinute = minute + 30;
        const endHour = endMinute >= 60 ? hour + 1 : hour;
        const finalEndMinute = endMinute >= 60 ? 0 : endMinute;

        const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        const endTime = `${endHour.toString().padStart(2, '0')}:${finalEndMinute.toString().padStart(2, '0')}`;

        const period = startHour < 12 ? 'AM' : 'PM';
        const displayHour = startHour > 12 ? startHour - 12 : startHour === 0 ? 12 : startHour;
        const displayMinute = startMinute.toString().padStart(2, '0');

        slots.push({
          startTime,
          endTime,
          display: `${displayHour}:${displayMinute} ${period}`,
          hour: startHour,
          minute: startMinute
        });
      }
    }
    return slots;
  };

  // Check if a time slot is available based on schedule
  const isSlotAvailable = (startTime: string, endTime: string, schedule: any[]) => {
    if (!schedule || schedule.length === 0) return true;

    for (const booking of schedule) {
      const bookingStart = booking.start.slice(0, 5);
      const bookingEnd = booking.end.slice(0, 5);

      // Check if there's any overlap
      if (
        (startTime >= bookingStart && startTime < bookingEnd) ||
        (endTime > bookingStart && endTime <= bookingEnd) ||
        (startTime <= bookingStart && endTime >= bookingEnd)
      ) {
        return false;
      }
    }
    return true;
  };

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [usersData, machinesData, roomsData] = await Promise.all([
          usersApi.getAll(),
          machinesApi.getAll({ category: 'MEDICAL' }),
          roomsApi.getAll({ type: 'PROCEDURE' }),
        ]);

        // Filter users to get only doctors
        const doctorUsers = (usersData as any[]).filter(user => user.role === 'DOCTOR');

        // Transform doctor users to Doctor type
        const transformedDoctors: Doctor[] = doctorUsers.map(user => ({
          id: user.id,
          name: user.name,
          specialty: 'แพทย์',
          isAvailable: user.is_available !== 0 && user.is_available !== false && user.is_available != null,
        }));

        // Transform API data using helper functions
        const transformedMachines = (machinesData as ApiMachine[]).map(m => ({
          ...transformMachine(m),
          isBusy: unavailableResources.machines.includes(m.id),
        }));
        const transformedRooms = (roomsData as ApiRoom[]).map(r => ({
          ...transformRoom(r),
          isBusy: unavailableResources.rooms.includes(r.id),
        }));

        // Separate rooms by type
        const prepRoomsList = transformedRooms.filter(r => r.room_type === 'PREP' || r.room_type === 'BOTH');
        const treatmentRoomsList = transformedRooms.filter(r => r.room_type === 'TREATMENT' || r.room_type === 'BOTH');
        const consultRoomsList = transformedRooms.filter(r =>
          r.room_type === 'CONSULTATION' ||
          (r.room_type === 'BOTH' && !r.name.startsWith('TR'))
        );

        setDoctors(transformedDoctors);
        setUsers(usersData as any[]); // เก็บรายชื่อผู้ใช้ทั้งหมด
        setMachines(transformedMachines);
        setRooms(transformedRooms);
        setPrepRooms(prepRoomsList);
        setTreatmentRooms(treatmentRoomsList);
        setConsultRooms(consultRoomsList);
        setAvailableRooms(treatmentRoomsList); // Default to treatment rooms
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

  // Load editing booking data from sessionStorage
  useEffect(() => {
    const loadEditingData = async () => {
      const editingBookingData = sessionStorage.getItem('editingBooking');
      if (editingBookingData && doctors.length > 0 && machines.length > 0 && rooms.length > 0) {
        try {
          const booking = JSON.parse(editingBookingData);

          // Set editing booking ID
          setEditingBookingId(booking.id);
          setIsConsultOnly(booking.isConsultOnly || false);

          // Set all the states from the saved booking
          setSelectedDate(booking.date);
          setPatientName(booking.patient);
          setPatientHN(booking.patient_hn || "");
          // For 3-stage bookings, startTime in sessionStorage is treatment start,
          // but calculateThreeStageTimes expects consult start as the input.
          // Use consultStartTime if available so the useEffect recalculates correctly.
          if (booking.consultStartTime) {
            setStartTime(booking.consultStartTime);
          } else {
            setStartTime(booking.startTime);
          }
          setEndTime(booking.endTime);
          setSelectedProcedureIds(booking.procedures);
          setNotes(booking.notes);

          // Find actual doctor/machine/room objects from the lists
          if (booking.doctorId) {
            const doctor = doctors.find(d => d.id.toString() === booking.doctorId.toString());
            if (doctor) setSelectedDoctor(doctor);
          }
          if (booking.machineId) {
            const machine = machines.find(m => m.id.toString() === booking.machineId.toString());
            if (machine) {
              setSelectedMachine(machine);
              // Fetch procedures for this machine
              try {
                const machineData = await machinesApi.getById(machine.id, true) as any;
                if (machineData.procedures && machineData.procedures.length > 0) {
                  setProcedures(machineData.procedures);
                }
              } catch (error) {
                console.error('Error fetching machine procedures:', error);
              }
            }
          }
          if (booking.roomId) {
            const room = rooms.find(r => r.id.toString() === booking.roomId.toString());
            if (room) setSelectedRoom(room);
          }
          if (booking.prepRoomId) {
            const prepRoom = prepRooms.find(r => r.id.toString() === booking.prepRoomId.toString());
            if (prepRoom) setSelectedPrepRoom(prepRoom);
          }
          if (booking.consultRoomId) {
            const consultRoom = consultRooms.find(r => r.id.toString() === booking.consultRoomId.toString());
            if (consultRoom) setSelectedConsultRoom(consultRoom);
          }

          if (booking.prepStartTime) setPrepStartTime(booking.prepStartTime);
          if (booking.prepEndTime) setPrepEndTime(booking.prepEndTime);

          // Note: We don't remove it here, user can clear it after confirming edit
        } catch (error) {
          console.error('Error loading editing booking data:', error);
        }
      }
    };

    loadEditingData();
  }, [doctors, machines, rooms, prepRooms, consultRooms]);

  // Check availability when date/time changes
  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedDate || !startTime || !endTime) return;

      try {
        const result = await bookingsApi.checkAvailability(
          selectedDate,
          toTimeWithSeconds(startTime),
          toTimeWithSeconds(endTime)
        ) as any;

        if (result.success) {
          setUnavailableResources(result.unavailable);
        }
      } catch (error) {
        console.error('Error checking availability:', error);
      }
    };

    checkAvailability();
  }, [selectedDate, startTime, endTime]);

  // Fetch detailed availability when resources are selected
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      usersApi.getAvailability(selectedDoctor.id, selectedDate)
        .then(data => setDoctorAvailability(data as any))
        .catch(err => console.error('Error fetching doctor availability:', err));
    } else {
      setDoctorAvailability(null);
    }
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    if (selectedMachine && selectedDate) {
      machinesApi.getAvailability(selectedMachine.id, selectedDate)
        .then(data => setMachineAvailability(data as any))
        .catch(err => console.error('Error fetching machine availability:', err));
    } else {
      setMachineAvailability(null);
    }
  }, [selectedMachine, selectedDate]);

  useEffect(() => {
    if (selectedRoom && selectedDate) {
      roomsApi.getAvailability(selectedRoom.id, selectedDate)
        .then(data => setRoomAvailability(data as any))
        .catch(err => console.error('Error fetching room availability:', err));
    } else {
      setRoomAvailability(null);
    }
  }, [selectedRoom, selectedDate]);

  useEffect(() => {
    if (selectedPrepRoom && selectedDate) {
      roomsApi.getAvailability(selectedPrepRoom.id, selectedDate)
        .then(data => setPrepRoomAvailability(data as any))
        .catch(err => console.error('Error fetching prep room availability:', err));
    } else {
      setPrepRoomAvailability(null);
    }
  }, [selectedPrepRoom, selectedDate]);

  useEffect(() => {
    if (selectedConsultRoom && selectedDate) {
      roomsApi.getAvailability(selectedConsultRoom.id, selectedDate)
        .then(data => setConsultRoomAvailability(data as any))
        .catch(err => console.error('Error fetching consult room availability:', err));
    } else {
      setConsultRoomAvailability(null);
    }
  }, [selectedConsultRoom, selectedDate]);

  // ❌ ไม่ auto-validate อีกต่อไป
  // Validation เกิดขึ้นเฉพาะเมื่อกดปุ่ม "ตรวจสอบการจอง" เท่านั้น
  // ทำให้ slot time แสดงตลอดจนกว่า user จะพร้อม validate

  const handleDoctorChange = (doctorId: string) => {
    const doctor = doctors.find(d => d.id === doctorId) || null;
    setSelectedDoctor(doctor);
  };

  const handleMachineChange = async (machineId: string) => {
    const machine = machines.find(m => m.id === machineId) || null;
    setSelectedMachine(machine);
    setSelectedProcedureIds([]); // Reset procedure selection
    setProcedures([]); // Clear procedures

    // Fetch procedures for this machine
    if (machine) {
      try {
        const machineData = await machinesApi.getById(machine.id, true) as any;
        if (machineData.procedures && machineData.procedures.length > 0) {
          setProcedures(machineData.procedures);
        }
      } catch (error) {
        console.error('Error fetching machine procedures:', error);
      }
    }

    // Only show Treatment rooms (TR) + Lounge 4 (L4) for machine selection
    setAvailableRooms(treatmentRooms);

    // Auto-select room for FIXED machines (e.g., Tesla -> L4, Fotona -> TR2, Pico -> TR4)
    if (machine && machine.type === MachineType.FIXED && machine.roomId) {
      // Find the fixed room for this machine
      const fixedRoom = rooms.find(r => r.id === machine.roomId);
      if (fixedRoom) {
        setSelectedRoom(fixedRoom); // Auto-select the fixed room
      } else {
        setSelectedRoom(null); // Room not found, reset
      }
    } else if (machine && machine.type === MachineType.MOVABLE) {
      // For MOVABLE machines, keep current room selection or reset if needed
      // No auto-selection needed
    } else {
      // No machine selected, reset room and time
      setSelectedRoom(null);
      if (!editingBookingId) {
        setStartTime('09:00');
        setEndTime('09:30');
      }
    }
  };

  // Auto-calculate end time based on selected procedures
  useEffect(() => {
    if (selectedProcedureIds.length > 0 && startTime) {
      const selectedProcedures = Array.isArray(procedures) ? procedures.filter(p => selectedProcedureIds.includes(p.id)) : [];

      // Check if any procedure is Tesla Former (prep room only, no treatment room)
      const prepRoomOnly = selectedProcedures.some(p => isPrepRoomOnlyProcedure(p.name));
      setIsPrepRoomOnly(prepRoomOnly);

      // Check if procedures should hide consult room
      const shouldHideConsult = selectedProcedures.some(p => shouldHideConsultRoom(p.name));
      setHideConsultRoom(shouldHideConsult);

      // Check if any procedure is 3-stage (miraDry)
      const threeStage = isThreeStageProcedure(selectedProcedures);
      setIsThreeStage(threeStage);

      if (threeStage) {
        // Calculate actual treatment duration (excluding procedures that are just 'ปรึกษา' or 'Consult')
        const treatmentProcedures = selectedProcedures.filter(p =>
          p.name !== 'ปรึกษา' && p.name !== 'Consult' && p.name !== 'Consultation'
        );

        // If all selected procedures are just consultation, the 'treatment' part is effectively 0
        // (but usually they will select at least one main procedure)
        // If it's miraDry, it will be included in treatmentProcedures since it contains miraDry keyword
        const treatmentDuration = treatmentProcedures.reduce((sum, p) => sum + (p.duration_minutes || 0), 0) || 30;

        const times = calculateThreeStageTimes(startTime, treatmentDuration);
        setThreeStageTimes(times);
        setEndTime(times.treatmentEndTime);
        setRequiresPrepRoom(false); // We handle prep inside 3-stage logic
      } else if (prepRoomOnly) {
        // Tesla Former: Uses prep room as the main room, no treatment room needed
        const maxPrepDuration = getMaxPrepDuration(selectedProcedures);
        setPrepDuration(maxPrepDuration);

        const treatmentDuration = selectedProcedures.reduce((sum, p) => sum + (p.duration_minutes || 0), 0);

        // For Tesla Former, the "prep room" is actually the treatment room
        // So we calculate end time from start time + duration
        const totalDuration = maxPrepDuration + treatmentDuration;
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + totalDuration;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;

        const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        setEndTime(newEndTime);

        // Auto-select L4 room for Tesla Former if machine has it configured
        if (selectedMachine && selectedMachine.roomIds && selectedMachine.roomIds.length > 0) {
          const l4Room = prepRooms.find(r =>
            selectedMachine.roomIds!.includes(r.id) &&
            (r.name.includes('L4') || r.name.includes('Lounge4'))
          );
          if (l4Room && !selectedPrepRoom) {
            setSelectedPrepRoom(l4Room);
          }
        }

        // Clear treatment room selection since we don't need it
        setSelectedRoom(null);
        setRequiresPrepRoom(false);
        setPrepStartTime('');
        setPrepEndTime('');
      } else {
        // Standard procedure logic (no add-on consult)
        const needsPrep = checkRequiresPrepRoom(selectedProcedures, selectedMachine?.name);
        setRequiresPrepRoom(needsPrep);

        const maxPrepDuration = getMaxPrepDuration(selectedProcedures);
        setPrepDuration(maxPrepDuration);

        const treatmentDuration = selectedProcedures.reduce((sum, p) => sum + (p.duration_minutes || 0), 0);

        if (needsPrep && maxPrepDuration > 0) {
          const { prepStartTime: calcPrepStart, prepEndTime: calcPrepEnd } =
            calculatePrepTimes(startTime, maxPrepDuration);

          setPrepStartTime(calcPrepStart);
          setPrepEndTime(calcPrepEnd);

          const [prepEndHours, prepEndMinutes] = calcPrepEnd.split(':').map(Number);
          const treatmentEndMinutes = prepEndHours * 60 + prepEndMinutes + treatmentDuration;
          const treatmentEndHours = Math.floor(treatmentEndMinutes / 60);
          const treatmentEndMins = treatmentEndMinutes % 60;

          setEndTime(`${treatmentEndHours.toString().padStart(2, '0')}:${treatmentEndMins.toString().padStart(2, '0')}`);
        } else {
          setPrepStartTime('');
          setPrepEndTime('');
          setSelectedPrepRoom(null);

          if (treatmentDuration > 0) {
            const [hours, minutes] = startTime.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes + treatmentDuration;
            const endHours = Math.floor(totalMinutes / 60);
            const endMinutes = totalMinutes % 60;

            setEndTime(`${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`);
          }
        }
      }

      // หมายเหตุ: ไม่ reset validation เมื่อ tick/untick procedure
      // เพื่อให้ summary card ยังคงแสดงอยู่ขณะเลือก/เลิกเลือกหัตถการ
    } else {
      setRequiresPrepRoom(false);
      setIsPrepRoomOnly(false);
      setHideConsultRoom(false);
      setPrepDuration(0);
      setPrepStartTime('');
      setPrepEndTime('');
      setSelectedPrepRoom(null);
      setIsThreeStage(false);
      setThreeStageTimes(null);
      setSelectedConsultRoom(null);
      // ✨ Reset to default duration (30 mins) when no services selected
      if (startTime && !isConsultOnly && selectedProcedureIds.length === 0) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + 30;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        setEndTime(`${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`);
      }
    }
  }, [selectedProcedureIds, startTime, procedures, selectedMachine, prepRooms, isConsultOnly, editingBookingId]);

  // Reset validation เมื่อเปลี่ยนข้อมูลหลัก (doctor, machine, room, date)
  // ไม่รวม procedure/time เพราะการ tick หัตถการไม่ควร reset summary card
  useEffect(() => {
    setValidationResult(null);
    setForceBooking(false);
  }, [
    selectedDoctor,
    selectedMachine,
    selectedRoom,
    selectedPrepRoom,
    selectedConsultRoom,
    selectedDate,
  ]);

  const handleRoomChange = (roomId: string) => {
    const room = (isConsultOnly ? consultRooms : availableRooms).find(r => r.id === roomId) || null;
    setSelectedRoom(room);
  };

  const handlePrepRoomChange = (roomId: string) => {
    const room = prepRooms.find(r => r.id === roomId) || null;
    setSelectedPrepRoom(room);
  };

  const handleValidateBooking = async () => {
    // For Tesla Former: prep room is the main room, no treatment room needed, and no doctor required
    const hasRequiredRoom = isPrepRoomOnly ? selectedPrepRoom : selectedRoom;

    if ((needsDoctor && !selectedDoctor) || (!isConsultOnly && !selectedMachine) || !hasRequiredRoom) {
      setValidationResult({
        success: false,
        message: 'กรุณาเลือกข้อมูลให้ครบถ้วน',
        errors: []
      });
      return;
    }

    try {
      // Call API to validate booking with real-time availability check
      const validationData: any = isConsultOnly ? {
        doctor_id: selectedDoctor?.id || null,
        machine_id: null,
        room_id: selectedRoom!.id,
        date: selectedDate,
        start_time: toTimeWithSeconds(startTime),
        end_time: toTimeWithSeconds(endTime),
        booking_type: 'CONSULTATION',
        is_consult_only: true,
      } : {
        doctor_id: selectedDoctor?.id || null,
        machine_id: selectedMachine!.id,
        // For Tesla Former, use prep room as the main room
        room_id: isPrepRoomOnly ? selectedPrepRoom!.id : selectedRoom!.id,
        date: selectedDate,
        // start_time = when doctor/machine are used (treatment start)
        start_time: toTimeWithSeconds(
          isThreeStage && threeStageTimes
            ? threeStageTimes.treatmentStartTime
            : (requiresPrepRoom ? prepEndTime : startTime)
        ),
        end_time: toTimeWithSeconds(endTime),
        procedure_ids: selectedProcedureIds, // ✨ เพิ่ม: ส่ง procedure_ids เพื่อ validate 3-stage
      };

      // Add exclude_booking_id when editing
      if (editingBookingId) {
        validationData.exclude_booking_id = editingBookingId; // ✨ เพิ่ม: ไม่ check conflict กับตัวเอง
      }

      // Add prep stage data if required (but not for Tesla Former)
      if (!isPrepRoomOnly && requiresPrepRoom && selectedPrepRoom) {
        validationData.prep_room_id = selectedPrepRoom.id;
        validationData.prep_start_time = toTimeWithSeconds(prepStartTime);
        validationData.prep_end_time = toTimeWithSeconds(prepEndTime);
      }

      // Add 3-stage data if required
      if (isThreeStage && selectedConsultRoom && threeStageTimes) {
        validationData.consult_room_id = selectedConsultRoom.id;
        validationData.consult_start_time = toTimeWithSeconds(threeStageTimes.consultStartTime);
        validationData.consult_end_time = toTimeWithSeconds(threeStageTimes.consultEndTime);
      }

      // Add consultation data for non-3-stage procedures (30 minutes before treatment)
      if (!isThreeStage && selectedConsultRoom && !hideConsultRoom) {
        // Calculate consultation times: 30 minutes before treatment start
        const treatmentStart = requiresPrepRoom ? prepEndTime : startTime;
        const [hours, minutes] = treatmentStart.split(':').map(Number);
        const treatmentStartMinutes = hours * 60 + minutes;
        const consultStartMinutes = treatmentStartMinutes - 30;
        const consultStartHours = Math.floor(consultStartMinutes / 60);
        const consultStartMins = consultStartMinutes % 60;
        const consultStart = `${consultStartHours.toString().padStart(2, '0')}:${consultStartMins.toString().padStart(2, '0')}`;
        
        validationData.consult_room_id = selectedConsultRoom.id;
        validationData.consult_start_time = toTimeWithSeconds(consultStart);
        validationData.consult_end_time = toTimeWithSeconds(treatmentStart);
      }

      // Add force_booking flag if user confirmed warnings
      if (forceBooking) {
        validationData.force_booking = true;
      }

      const result = await bookingsApi.validate(validationData) as any;

      setValidationResult(result);

      // ✨ Check if there are warnings that require confirmation
      if (result.success && result.requiresConfirmation && result.warnings) {
        setWarningDialog({
          open: true,
          warnings: result.warnings,
        });
        return;
      }

      if (!result.success) {
        // Show detailed error messages if available
        const errorMessage = result.errors && result.errors.length > 0
          ? result.errors.join('\n')
          : (result.message || 'ไม่สามารถจองได้');

        setNotificationDialog({
          open: true,
          title: 'ไม่สามารถจองได้',
          description: errorMessage,
          type: 'error',
        });
      } else {
        setNotificationDialog({
          open: true,
          title: 'ตรวจสอบสำเร็จ',
          description: result.message,
          type: 'success',
        });
      }
    } catch (error: any) {
      const errorMsg = error.message || 'เกิดข้อผิดพลาดในการตรวจสอบ';
      setValidationResult({
        success: false,
        message: errorMsg,
        errors: [errorMsg]
      });
      setNotificationDialog({
        open: true,
        title: 'เกิดข้อผิดพลาด',
        description: errorMsg,
        type: 'error',
      });
    }
  };

  const handleConfirmBookingClick = () => {
    if (!validationResult?.success) {
      setNotificationDialog({
        open: true,
        title: 'ไม่สามารถจองได้',
        description: 'กรุณาตรวจสอบการจองก่อนยืนยัน',
        type: 'error',
      });
      return;
    }

    // For Tesla Former: prep room is the main room, no treatment room needed, and no doctor required
    const hasRequiredRoom = isPrepRoomOnly ? selectedPrepRoom : selectedRoom;

    if ((needsDoctor && !selectedDoctor) || (!isConsultOnly && !selectedMachine) || !hasRequiredRoom) {
      setNotificationDialog({
        open: true,
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณาเลือกข้อมูลให้ครบถ้วน',
        type: 'error',
      });
      return;
    }

    if (!patientName.trim()) {
      setNotificationDialog({
        open: true,
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกชื่อผู้ป่วย',
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
    const roomName = isPrepRoomOnly ? selectedPrepRoom!.name : selectedRoom!.name;
    setConfirmDialog({
      open: true,
      title: editingBookingId ? 'ยืนยันการอัปเดต' : 'ยืนยันการจอง',
      description: editingBookingId
        ? `คุณต้องการอัปเดตการจองห้อง ${roomName} สำหรับ ${patientName} ในวันที่ ${selectedDate} เวลา ${startTime}-${endTime} ใช่หรือไม่?`
        : `คุณต้องการจองห้อง ${roomName} สำหรับ ${patientName} ในวันที่ ${selectedDate} เวลา ${startTime}-${endTime} ใช่หรือไม่?`,
      onConfirm: handleConfirmBooking,
    });
  };

  const handleConfirmBooking = async () => {

    try {
      // Create booking in database
      const bookingData: any = {
        patient_name: patientName,
        patient_hn: patientHN,
        date: selectedDate,
      };

      // Add consultation-only specific fields
      if (isConsultOnly) {
        bookingData.room_id = selectedRoom!.id;
        bookingData.is_consult_only = true;
        bookingData.booking_type = 'CONSULTATION';
        bookingData.doctor_id = selectedDoctor?.id || null; // Allow doctor selection
        bookingData.machine_id = null;
      } else {
        // Normal procedure booking
        bookingData.doctor_id = selectedDoctor?.id || null;
        bookingData.machine_id = selectedMachine.id;
        // For Tesla Former, use prep room as the main room
        bookingData.room_id = isPrepRoomOnly ? selectedPrepRoom!.id : selectedRoom!.id;
        bookingData.procedure_ids = selectedProcedureIds; // ส่งเป็น array ของ IDs
      }

      bookingData.start_time = toTimeWithSeconds(
        isConsultOnly ? startTime : (
          isThreeStage && threeStageTimes
            ? threeStageTimes.treatmentStartTime
            : (requiresPrepRoom ? prepEndTime : startTime)
        )
      );
      bookingData.end_time = toTimeWithSeconds(endTime);
      bookingData.status = editingBookingId ? undefined : 'CONFIRMED'; // Don't change status when editing
      bookingData.notes = notes || '';

      // ✨ Add force_booking flag if user confirmed warnings
      if (forceBooking) {
        bookingData.force_booking = true;
      }

      // Add prep stage data if required (Standard 2-stage, but not for Tesla Former)
      if (!isThreeStage && !isPrepRoomOnly && requiresPrepRoom && selectedPrepRoom && prepStartTime && prepEndTime) {
        bookingData.prep_room_id = selectedPrepRoom.id;
        bookingData.prep_start_time = toTimeWithSeconds(prepStartTime);
        bookingData.prep_end_time = toTimeWithSeconds(prepEndTime);
      }

      // Add 3-stage data (miraDry)
      if (isThreeStage && selectedConsultRoom && threeStageTimes && !hideConsultRoom) {
        bookingData.consult_room_id = selectedConsultRoom.id;
        bookingData.consult_start_time = toTimeWithSeconds(threeStageTimes.consultStartTime);
        bookingData.consult_end_time = toTimeWithSeconds(threeStageTimes.consultEndTime);
        // Prep part of miraDry shares the main room usually, but we save times
        bookingData.prep_start_time = toTimeWithSeconds(threeStageTimes.prepStartTime);
        bookingData.prep_end_time = toTimeWithSeconds(threeStageTimes.prepEndTime);
      }

      // Add consultation data for non-3-stage procedures (30 minutes before treatment)
      if (!isThreeStage && selectedConsultRoom && !hideConsultRoom) {
        // Calculate consultation times: 30 minutes before treatment start
        const treatmentStart = requiresPrepRoom ? prepEndTime : startTime;
        const [hours, minutes] = treatmentStart.split(':').map(Number);
        const treatmentStartMinutes = hours * 60 + minutes;
        const consultStartMinutes = treatmentStartMinutes - 30;
        const consultStartHours = Math.floor(consultStartMinutes / 60);
        const consultStartMins = consultStartMinutes % 60;
        const consultStart = `${consultStartHours.toString().padStart(2, '0')}:${consultStartMins.toString().padStart(2, '0')}`;
        
        bookingData.consult_room_id = selectedConsultRoom.id;
        bookingData.consult_start_time = toTimeWithSeconds(consultStart);
        bookingData.consult_end_time = toTimeWithSeconds(treatmentStart);
      }

      // Show loading
      setNotificationDialog({
        open: true,
        title: 'กำลังบันทึก',
        description: 'กรุณารอสักครู่...',
        type: 'loading',
      });

      // Call create or update based on editingBookingId
      let result: any;
      if (editingBookingId) {
        // Update existing booking
        result = await bookingsApi.update(editingBookingId, bookingData);
      } else {
        // Create new booking


        result = await bookingsApi.create(bookingData);
      }

      // ตรวจสอบว่า API return error หรือไม่
      if (result.success === false) {
        // ✨ Check if it's a warning that requires confirmation
        if (result.requiresConfirmation && result.warnings) {
          setWarningDialog({
            open: true,
            warnings: result.warnings,
          });
          setNotificationDialog({ open: false, title: '', description: '', type: 'success' });
          return;
        }

        // แสดง error ทั้งหมด
        const errorMessages = result.errors && result.errors.length > 0
          ? result.errors.join('\n')
          : result.message || 'ไม่สามารถจองได้';

        setNotificationDialog({
          open: true,
          title: 'ไม่สามารถจองได้',
          description: errorMessages,
          type: 'error',
        });

        // Reset validation เพื่อให้ user ตรวจสอบใหม่
        setValidationResult(null);
        return;
      }

      setNotificationDialog({
        open: true,
        title: 'จองสำเร็จ!',
        description: editingBookingId ? 'อัปเดตข้อมูลเรียบร้อยแล้ว' : 'บันทึกข้อมูลเรียบร้อยแล้ว',
        type: 'success',
      });

      // If editing, save date for auto-scroll back to calendar
      if (editingBookingId) {
        sessionStorage.setItem('scrollToDate', selectedDate);
        sessionStorage.setItem('scrollToBookingId', editingBookingId);

        // Navigate back to calendar after short delay
        setTimeout(() => {
          if (onNavigateToCalendar) {
            onNavigateToCalendar();
          }
        }, 1500);
      }

      // Clear editing booking data
      sessionStorage.removeItem('editingBooking');
      setEditingBookingId(null);

      // Reset form
      setSelectedDoctor(null);
      setSelectedMachine(null);
      setSelectedRoom(null);
      setSelectedPrepRoom(null);
      setRequiresPrepRoom(false);
      setPrepDuration(0);
      setPrepStartTime('');
      setPrepEndTime('');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('10:00');
      setPatientName('');
      setPatientHN('');
      setNotes('');
      setSelectedProcedureIds([]);
      setValidationResult(null);
      setSelectedConsultRoom(null);
      setIsThreeStage(false);
      setThreeStageTimes(null);
      setForceBooking(false);

      // Refresh data after successful booking
      const [usersData, machinesData, roomsData] = await Promise.all([
        usersApi.getAll(),
        machinesApi.getAll({ category: 'MEDICAL' }),
        roomsApi.getAll({ type: 'PROCEDURE' }),
      ]);

      // Filter users to get only doctors
      const doctorUsers = (usersData as any[]).filter(user => user.role === 'DOCTOR');

      // Transform doctor users to Doctor type
      const refreshedDoctors: Doctor[] = doctorUsers.map(user => ({
        id: user.id,
        name: user.name,
        specialty: 'แพทย์',
        isAvailable: user.is_available !== 0 && user.is_available !== false && user.is_available != null,
      }));

      const refreshedMachines = (machinesData as ApiMachine[]).map(m => ({
        ...transformMachine(m),
        isBusy: unavailableResources.machines.includes(m.id),
      }));
      const refreshedRooms = (roomsData as ApiRoom[]).map(r => ({
        ...transformRoom(r),
        isBusy: unavailableResources.rooms.includes(r.id),
      }));

      // Separate rooms by type
      // BOTH type rooms appear in both lists
      const refreshedPrepRooms = refreshedRooms.filter(r =>
        r.room_type === 'PREP' || r.room_type === 'BOTH'
      );

      const refreshedTreatmentRooms = refreshedRooms.filter(r =>
        r.room_type === 'TREATMENT' ||
        r.room_type === 'BOTH' ||
        // Special case: Lounge 4 is dual-purpose
        r.name.includes('L4') ||
        r.name.includes('Lounge4')
      );

      const refreshedConsultRooms = refreshedRooms.filter(r =>
        r.room_type === 'CONSULTATION' ||
        (r.room_type === 'BOTH' && !r.name.startsWith('TR'))
      );

      setDoctors(refreshedDoctors);
      setMachines(refreshedMachines);
      setRooms(refreshedRooms);
      setPrepRooms(refreshedPrepRooms);
      setTreatmentRooms(refreshedTreatmentRooms);
      setConsultRooms(refreshedConsultRooms);
      setAvailableRooms(refreshedTreatmentRooms);
    } catch (error: any) {
      // Handle network errors
      const errorMsg = error.message || 'ไม่สามารถบันทึกการจองได้';
      setNotificationDialog({
        open: true,
        title: 'เกิดข้อผิดพลาด',
        description: errorMsg,
        type: 'error',
      });

      // Reset validation เพื่อให้ user ตรวจสอบใหม่
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
      {/* Breadcrumb / Back Button */}
      {editingBookingId && onNavigateToCalendar && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Clear editing state
              sessionStorage.removeItem('editingBooking');
              setEditingBookingId(null);
              // Navigate back to calendar
              onNavigateToCalendar();
            }}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปปฏิทิน
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">แก้ไขการจอง</span>
        </div>
      )}

      {/* Editing mode indicator */}
      {editingBookingId && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800 font-medium">กำลังแก้ไขการจอง</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem('editingBooking');
              setEditingBookingId(null);
              // Reset form
              setSelectedDoctor(null);
              setSelectedMachine(null);
              setSelectedRoom(null);
              setSelectedPrepRoom(null);
              setRequiresPrepRoom(false);
              setPrepDuration(0);
              setPrepStartTime('');
              setPrepEndTime('');
              setSelectedDate(new Date().toISOString().split('T')[0]);
              setStartTime('09:00');
              setEndTime('10:00');
              setPatientName('');
              setPatientHN('');
              setNotes('');
              setSelectedProcedureIds([]);
              setValidationResult(null);
              setSelectedConsultRoom(null);
            }}
          >
            ยกเลิกการแก้ไข
          </Button>
        </div>
      )}

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
            <CardDescription>กรุณาเลือกข้อมูลให้ครบถ้วน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ผู้จอง - แสดงที่ด้านบนสุด (Auto-fill จาก user ที่ login) */}
            <div className="space-y-2">
              <Label htmlFor="createdBy" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                ผู้จอง
              </Label>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                <div className="w-10 h-10 rounded-full bg-[#c5a059] flex items-center justify-center text-white font-semibold">
                  {getUserInitials(user?.name || '')}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{user?.name || 'ไม่ระบุ'}</p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {user?.role || 'USER'}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>

            {/* Booking Mode Toggle - Consultation Only */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <div>
                    <Label htmlFor="consult-mode" className="text-sm font-medium text-blue-900 cursor-pointer">
                      จองห้องปรึกษาเท่านั้น
                    </Label>
                    <p className="text-xs text-blue-700 mt-0.5">
                      {isConsultOnly ? 'เลือกเฉพาะห้องปรึกษา (C) ไม่ต้องเลือกเครื่องมือและหัตถการ แต่เลือกหมอได้' : 'จองหัตถการปกติ (ต้องเลือกเครื่องมือและหัตถการ)'}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="consult-mode"
                  checked={isConsultOnly}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsConsultOnly(checked);
                    // Reset selections when switching modes
                    if (checked) {
                      setSelectedMachine(null);
                      setSelectedProcedureIds([]);
                      setSelectedRoom(null);
                      setSelectedPrepRoom(null);
                      setSelectedConsultRoom(null);
                      setRequiresPrepRoom(false);
                      setIsPrepRoomOnly(false);
                      setIsThreeStage(false);
                      setThreeStageTimes(null);
                      // Keep selectedDoctor for consultation mode
                    } else {
                      setSelectedRoom(null);
                    }
                  }}

                  disabled={!canBook}
                />
              </div>
            </div>

            {!isDoctorOptional && (
              <div className="space-y-2">
                <Label htmlFor="doctor" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  เลือกหมอ
                </Label>
                <Select value={selectedDoctor?.id} onValueChange={handleDoctorChange} disabled={!canBook}>
                  <SelectTrigger id="doctor">
                    <SelectValue placeholder="เลือกหมอ" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.length === 0 ? (
                      <SelectItem value="no-doctors" disabled>
                        ไม่มีแพทย์ในระบบ
                      </SelectItem>
                    ) : (
                      doctors.map((doctor: Doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id} disabled={!doctor.isAvailable}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${doctor.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span className={!doctor.isAvailable ? 'text-muted-foreground' : ''}>
                                {doctor.name} ({doctor.specialty})
                              </span>
                            </div>
                            {!doctor.isAvailable && (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-500 border-gray-200">
                                ไม่พร้อมใช้งาน
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {selectedDoctor && doctorAvailability && (
                  <div className="mt-1">
                    {showDoctorSchedule && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-md border text-xs space-y-2">
                        <h4 className="font-medium text-slate-700">ตารางเวลาวันนี้</h4>
                        {doctorAvailability.schedule.length === 0 ? (
                          <p className="text-slate-400 italic text-center py-2">ไม่มีนัดหมาย</p>
                        ) : (
                          <div className="space-y-2">
                            {doctorAvailability.schedule.map((slot, i) => (
                              <div key={i} className="flex gap-2 pb-2 border-b last:border-0">
                                <span className="font-mono text-slate-700 w-24 flex-shrink-0">
                                  {slot.start.slice(0, 5)} - {slot.end.slice(0, 5)}
                                </span>
                                <div className="text-slate-600 flex-1">
                                  <div className="font-medium">{slot.service}</div>
                                  <div className="text-slate-400 text-xs">{slot.room}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isConsultOnly && (
              <div className="space-y-2">
                <Label htmlFor="machine" className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  เลือกเครื่องมือ
                </Label>
                <Select value={selectedMachine?.id} onValueChange={handleMachineChange} disabled={!canBook}>
                  <SelectTrigger id="machine">
                    <SelectValue placeholder="เลือกเครื่องมือ" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine: Machine) => (
                      <SelectItem
                        key={machine.id}
                        value={machine.id}
                        disabled={!machine.isAvailable}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${machine.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className={!machine.isAvailable ? "text-muted-foreground" : ""}>
                              {machine.name}
                            </span>
                          </div>
                          {!machine.isAvailable && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-500 border-gray-200">
                              ไม่พร้อมใช้งาน
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isConsultOnly && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  เลือกหัตถการ (เลือกได้หลายรายการ)
                </Label>
                <div
                  className={`border rounded-md p-3 space-y-2 ${!selectedMachine || procedures.length === 0 ? 'bg-muted/50 opacity-60' : ''}`}
                  style={{
                    maxHeight: procedures.length > 4 ? '240px' : 'auto',
                    overflowY: procedures.length > 4 ? 'auto' : 'visible'
                  }}
                >
                  {!selectedMachine ? (
                    <p className="text-sm text-muted-foreground italic text-center py-4">กรุณาเลือกเครื่องมือก่อน</p>
                  ) : procedures.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-4">ไม่มีหัตถการสำหรับเครื่องนี้</p>
                  ) : (
                    Array.isArray(procedures) && procedures.map((procedure: any) => (
                      <label
                        key={procedure.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer border border-transparent hover:border-border transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={selectedProcedureIds.includes(procedure.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProcedureIds([...selectedProcedureIds, procedure.id]);
                              } else {
                                const newList = selectedProcedureIds.filter(id => id !== procedure.id);
                                setSelectedProcedureIds(newList);
                                // ✨ Reset time to default if all procedures unchecked
                                if (newList.length === 0 && !editingBookingId && !isConsultOnly) {
                                  setStartTime('09:00');
                                  setEndTime('09:30');
                                }
                              }
                            }}
                          />
                          <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {procedure.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground transition-colors">
                          {procedure.duration_minutes} นาที
                        </span>
                      </label>
                    ))
                  )}
                </div>

                {selectedProcedureIds.length > 0 && (
                  <div className="flex justify-between items-center p-2 bg-primary/5 rounded-md border border-primary/10">
                    <span className="text-xs font-medium text-primary">เลือกแล้ว {selectedProcedureIds.length} รายการ</span>
                    <span className="text-xs font-bold text-primary">
                      รวมเวลา: {
                        (() => {
                          const selectedProcs = Array.isArray(procedures) ? procedures.filter(p => selectedProcedureIds.includes(p.id)) : [];
                          return selectedProcs.length > 0
                            ? selectedProcs.reduce((sum, p) => sum + (p.duration_minutes || 0), 0)
                            : 0;
                        })()
                      } นาที
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="patientName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                ชื่อผู้ป่วย
              </Label>
              <Input
                id="patientName"
                placeholder="กรอกชื่อผู้ป่วย"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                disabled={!canBook}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patientHN" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                HN (ถ้ามี)
              </Label>
              <Input
                id="patientHN"
                placeholder="กรอก HN ผู้ป่วย"
                value={patientHN}
                onChange={(e) => setPatientHN(e.target.value)}
                disabled={!canBook}
              />
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {requiresPrepRoom ? 'เวลาเริ่มเตรียมตัว' : 'เวลาเริ่ม'}
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    const newStartTime = e.target.value;
                    setStartTime(newStartTime);
                  }}
                  disabled={!canBook}
                  min="09:00"
                  max="20:00"
                />
                {requiresPrepRoom && prepStartTime && (
                  <p className="text-xs text-muted-foreground">
                    เตรียมตัว: {prepStartTime} - {prepEndTime}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {requiresPrepRoom ? 'เวลาสิ้นสุดหัตถการ' : 'เวลาสิ้นสุด'}
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
                {requiresPrepRoom && prepEndTime && (
                  <p className="text-xs text-muted-foreground">
                    ทำหัตถการ: {prepEndTime} - {endTime}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                ระบุหมายเหตุเพิ่มเติม (ช่องนี้ไม่จำเป็นต้องระบุ)
              </Label>
              <Textarea
                id="notes"
                placeholder="ระบุหมายเหตุเพิ่มเติม..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canBook}
                rows={2}
              />
            </div>

            {/* Consult Room Selection - Available for all procedures */}
            {!isConsultOnly && selectedMachine && (
              <ConsultRoomSelector
                consultRooms={consultRooms}
                selectedConsultRoom={selectedConsultRoom}
                onConsultRoomChange={(roomId) => {
                  const room = consultRooms.find(r => r.id === roomId) || null;
                  setSelectedConsultRoom(room);
                }}
                consultStartTime={
                  isThreeStage && threeStageTimes 
                    ? threeStageTimes.consultStartTime 
                    : (() => {
                        // Calculate consultation start time for non-3-stage procedures (30 minutes before treatment)
                        const treatmentStart = requiresPrepRoom ? prepEndTime : startTime;
                        if (!treatmentStart) return undefined;
                        const [hours, minutes] = treatmentStart.split(':').map(Number);
                        const treatmentStartMinutes = hours * 60 + minutes;
                        const consultStartMinutes = treatmentStartMinutes - 30;
                        const consultStartHours = Math.floor(consultStartMinutes / 60);
                        const consultStartMins = consultStartMinutes % 60;
                        return `${consultStartHours.toString().padStart(2, '0')}:${consultStartMins.toString().padStart(2, '0')}`;
                      })()
                }
                consultEndTime={
                  isThreeStage && threeStageTimes 
                    ? threeStageTimes.consultEndTime 
                    : (requiresPrepRoom ? prepEndTime : startTime)
                }
                disabled={!canBook}
              />
            )}

            {/* Prep Room Selection - Show for Tesla Former OR standard prep procedures */}
            {(isPrepRoomOnly || requiresPrepRoom) && (
              <PrepRoomSelector
                prepRooms={prepRooms}
                selectedPrepRoom={selectedPrepRoom}
                onPrepRoomChange={handlePrepRoomChange}
                prepStartTime={prepStartTime}
                prepEndTime={prepEndTime}
                disabled={!canBook}
                isPrepRoomOnly={isPrepRoomOnly}
              />
            )}

            {/* Treatment Room Selection - Hide for Tesla Former */}
            {!isPrepRoomOnly && (
              <div className="space-y-2">
                <Label htmlFor="room" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {isConsultOnly ? 'เลือกห้องปรึกษา (C)' : (requiresPrepRoom ? 'เลือกห้องทำหัตถการ (TR)' : 'เลือกห้อง')}
                </Label>
                <Select value={selectedRoom?.id} onValueChange={handleRoomChange} disabled={!canBook || (isConsultOnly ? false : !selectedMachine)}>
                  <SelectTrigger id="room">
                    <SelectValue placeholder={isConsultOnly ? "เลือกห้องปรึกษา" : (requiresPrepRoom ? "เลือกห้องทำหัตถการ" : "เลือกห้อง")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(isConsultOnly ? consultRooms : (requiresPrepRoom ? treatmentRooms : availableRooms)).map((room: Room) => {
                      // Check if machine has specific rooms assigned
                      // Use roomIds array for check instead of single roomId
                      let isIncompatible = selectedMachine?.roomIds &&
                        selectedMachine.roomIds.length > 0 &&
                        !selectedMachine.roomIds.includes(room.id);

                      // Special case for Tesla and Lounge 4 (L4)
                      if (selectedMachine?.name.includes('Tesla') && (room.name.includes('L4') || room.name.includes('Lounge4'))) {
                        isIncompatible = false;
                      }

                      return (
                        <SelectItem key={room.id} value={room.id} disabled={isIncompatible || !room.isAvailable}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${room.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span className={(isIncompatible || !room.isAvailable) ? 'text-muted-foreground' : ''}>
                                {room.name}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              {!room.isAvailable && (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-500 border-gray-200">
                                  ไม่พร้อมใช้งาน
                                </Badge>
                              )}
                              {isIncompatible && (
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                  ไม่ตรงกับเครื่อง
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedMachine?.roomIds && selectedMachine.roomIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">เครื่องนี้รองรับเฉพาะบางห้องที่ระบุไว้</p>
                )}
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={handleValidateBooking}
                disabled={
                  !canBook ||
                  (isConsultOnly ? (
                    // Consultation-only mode: need room, patient name, and doctor if required
                    !selectedRoom ||
                    !patientName ||
                    (needsDoctor && !selectedDoctor)
                  ) : (
                    // Normal procedure mode
                    (needsDoctor && !selectedDoctor) ||
                    !selectedMachine ||
                    (!isPrepRoomOnly && !selectedRoom) || // Tesla Former doesn't need treatment room
                    (isPrepRoomOnly && !selectedPrepRoom) || // Tesla Former needs prep room
                    !patientName ||
                    (requiresPrepRoom && !selectedPrepRoom)
                  ))
                }
                className="w-full"
                variant="outline"
              >
                ตรวจสอบการจอง
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ผลการตรวจสอบ</CardTitle>
            <CardDescription>ระบบจะตรวจสอบความพร้อมของทุกรายการ</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDoctor && !isDoctorOptional && !selectedMachine && !selectedRoom ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">กรุณาเลือกข้อมูลเพื่อดูความพร้อม</p>
              </div>
            ) : validationResult?.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-800">{validationResult.message}</p>
                </div>

                {/* Booking Summary Card */}
                <BookingSummaryCard
                  selectedDoctor={selectedDoctor}
                  selectedMachine={selectedMachine}
                  selectedRoom={selectedRoom}
                  selectedPrepRoom={selectedPrepRoom}
                  selectedDate={selectedDate}
                  prepStartTime={prepStartTime}
                  prepEndTime={prepEndTime}
                  startTime={startTime}
                  endTime={endTime}
                  patientName={patientName}
                  patientHN={patientHN}
                  notes={notes}
                  createdBy={user?.name || 'ไม่ระบุ'}
                  selectedProcedures={Array.isArray(procedures) ? procedures.filter(p => selectedProcedureIds.includes(p.id)) : []}
                  requiresPrepRoom={requiresPrepRoom}
                  isThreeStage={isThreeStage}
                  threeStageTimes={threeStageTimes}
                  selectedConsultRoom={selectedConsultRoom}
                  isConsultOnly={isConsultOnly}
                  isPrepRoomOnly={isPrepRoomOnly}
                />

                <Button onClick={handleConfirmBookingClick} className="w-full" size="lg">
                  {editingBookingId ? 'อัปเดตการจอง' : 'ยืนยันการจอง'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Show missing fields warning */}
                {((needsDoctor && !selectedDoctor) || !selectedMachine || (!isPrepRoomOnly && !selectedRoom) || (isPrepRoomOnly && !selectedPrepRoom) || !patientName || (requiresPrepRoom && !selectedPrepRoom) || (isThreeStage && !hideConsultRoom && !selectedConsultRoom)) && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">กรุณาเลือกข้อมูลให้ครบ:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-xs">
                        {needsDoctor && !selectedDoctor && <li>เลือกหมอ</li>}
                        {!selectedMachine && <li>เลือกเครื่องมือ</li>}
                        {!isPrepRoomOnly && !selectedRoom && <li>เลือกห้องทำหัตถการ (TR)</li>}
                        {isPrepRoomOnly && !selectedPrepRoom && <li>เลือกห้องทำหัตถการ</li>}
                        {requiresPrepRoom && !selectedPrepRoom && <li>เลือกห้องเตรียมตัว (L1-L4)</li>}
                        {!patientName && <li>กรอกชื่อผู้ป่วย</li>}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Show doctor time slots */}
                {!isDoctorOptional && selectedDoctor && doctorAvailability && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <User className="h-5 w-5" />
                      <span>เลือกเวลาหมอ - {selectedDoctor.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {generateTimeSlots().map((slot) => {
                        const available = isSlotAvailable(slot.startTime, slot.endTime, doctorAvailability.schedule);
                        const isSelected = startTime === slot.startTime && endTime === slot.endTime;
                        return (
                          <button
                            key={slot.startTime}
                            onClick={() => {
                              if (available) {
                                setStartTime(slot.startTime);
                                setEndTime(slot.endTime);
                              }
                            }}
                            disabled={!available || !canBook}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${isSelected
                              ? 'bg-[#c5a059] text-white ring-2 ring-[#c5a059] ring-offset-2 scale-105'
                              : available
                                ? 'bg-[#e8d8a1] hover:bg-[#d4c48d] text-amber-900 cursor-pointer'
                                : 'bg-[#800200] text-white cursor-not-allowed opacity-80'
                              } ${!canBook ? 'opacity-50' : ''}`}
                          >
                            {slot.display}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show machine time slots */}
                {selectedMachine && machineAvailability && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <Stethoscope className="h-5 w-5" />
                      <span>เลือกเวลาเครื่อง - {selectedMachine.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {generateTimeSlots().map((slot) => {
                        const available = isSlotAvailable(slot.startTime, slot.endTime, machineAvailability.schedule);
                        const isSelected = startTime === slot.startTime && endTime === slot.endTime;
                        return (
                          <button
                            key={slot.startTime}
                            onClick={() => {
                              if (available) {
                                setStartTime(slot.startTime);
                                setEndTime(slot.endTime);
                              }
                            }}
                            disabled={!available || !canBook}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${isSelected
                              ? 'bg-[#c5a059] text-white ring-2 ring-[#c5a059] ring-offset-2 scale-105'
                              : available
                                ? 'bg-[#e8d8a1] hover:bg-[#d4c48d] text-amber-900 cursor-pointer'
                                : 'bg-[#800200] text-white cursor-not-allowed opacity-80'
                              } ${!canBook ? 'opacity-50' : ''}`}
                          >
                            {slot.display}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show Consult Room time slots */}
                {(isThreeStage && selectedConsultRoom && consultRoomAvailability) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <Building2 className="h-5 w-5" />
                      <span>เลือกเวลาห้องปรึกษา - {selectedConsultRoom.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {generateTimeSlots().map((slot) => {
                        const available = isSlotAvailable(slot.startTime, slot.endTime, consultRoomAvailability.schedule);
                        const isSelected = (isThreeStage && threeStageTimes?.consultStartTime === slot.startTime);

                        return (
                          <button
                            key={slot.startTime}
                            onClick={() => {
                              if (available) {
                                if (isThreeStage) {
                                  // Consult (30) + Prep (30) = 60 mins offset for Treatment Start
                                  const [h, m] = slot.startTime.split(':').map(Number);
                                  const treatStartMin = h * 60 + m + 60;
                                  const newH = Math.floor(treatStartMin / 60);
                                  const newM = treatStartMin % 60;
                                  const newTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
                                  setStartTime(newTime);
                                } else {
                                  // For addon consult: just set startTime (useEffect will handle the rest)
                                  setStartTime(slot.startTime);
                                }
                              }
                            }}
                            disabled={!available || !canBook}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${isSelected
                              ? 'bg-[#c5a059] text-white ring-2 ring-[#c5a059] ring-offset-2 scale-105'
                              : available
                                ? 'bg-[#e8d8a1] hover:bg-[#d4c48d] text-amber-900 cursor-pointer'
                                : 'bg-[#800200] text-white cursor-not-allowed opacity-80'
                              } ${!canBook ? 'opacity-50' : ''}`}
                          >
                            {slot.display}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show Prep Room time slots */}
                {requiresPrepRoom && selectedPrepRoom && prepRoomAvailability && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <Building2 className="h-5 w-5" />
                      <span>เลือกเวลาห้องเตรียมตัว - {selectedPrepRoom.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {generateTimeSlots().map((slot) => {
                        const available = isSlotAvailable(slot.startTime, slot.endTime, prepRoomAvailability.schedule);
                        // Highlight if matches current prepStartTime (start of the prep slot)
                        const isSelected = prepStartTime === slot.startTime;

                        return (
                          <button
                            key={slot.startTime}
                            onClick={() => {
                              if (available) {
                                // Treatment starts after Prep Duration
                                const [h, m] = slot.startTime.split(':').map(Number);
                                const treatStartMin = h * 60 + m + prepDuration;
                                const newH = Math.floor(treatStartMin / 60);
                                const newM = treatStartMin % 60;
                                const newTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
                                setStartTime(newTime);
                              }
                            }}
                            disabled={!available || !canBook}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${isSelected
                              ? 'bg-[#c5a059] text-white ring-2 ring-[#c5a059] ring-offset-2 scale-105'
                              : available
                                ? 'bg-[#e8d8a1] hover:bg-[#d4c48d] text-amber-900 cursor-pointer'
                                : 'bg-[#800200] text-white cursor-not-allowed opacity-80'
                              } ${!canBook ? 'opacity-50' : ''}`}
                          >
                            {slot.display}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show room time slots */}
                {selectedRoom && roomAvailability && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                      <Building2 className="h-5 w-5" />
                      <span>เลือกเวลาห้อง - {selectedRoom.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {generateTimeSlots().map((slot) => {
                        const available = isSlotAvailable(slot.startTime, slot.endTime, roomAvailability.schedule);
                        const isSelected = startTime === slot.startTime && endTime === slot.endTime;
                        return (
                          <button
                            key={slot.startTime}
                            onClick={() => {
                              if (available) {
                                setStartTime(slot.startTime);
                                setEndTime(slot.endTime);
                              }
                            }}
                            disabled={!available || !canBook}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${isSelected
                              ? 'bg-[#c5a059] text-white ring-2 ring-[#c5a059] ring-offset-2 scale-105'
                              : available
                                ? 'bg-[#e8d8a1] hover:bg-[#d4c48d] text-amber-900 cursor-pointer'
                                : 'bg-[#800200] text-white cursor-not-allowed opacity-80'
                              } ${!canBook ? 'opacity-50' : ''}`}
                          >
                            {slot.display}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show validation error if exists */}
                {validationResult && !validationResult.success && (
                  <div className="flex flex-col gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-sm font-semibold text-red-800">{validationResult.message}</p>
                    </div>
                    {validationResult.errors && validationResult.errors.length > 0 && (
                      <ul className="list-disc list-inside space-y-1 ml-8">
                        {validationResult.errors.map((err: string, i: number) => (
                          <li key={i} className="text-xs text-red-700">{err}</li>
                        ))}
                      </ul>
                    )}
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

      {/* ✨ Warning Dialog for miraDry overlaps */}
      <ConfirmDialog
        open={warningDialog.open}
        onOpenChange={(open) => setWarningDialog({ ...warningDialog, open })}
        title="⚠️ คำเตือน: การจองทับซ้อน"
        description={
          warningDialog.warnings.length > 0
            ? warningDialog.warnings.map(w => `${w.message}\n${w.detail || ''}`).join('\n\n') +
            '\n\nการจองนี้จะทับซ้อนกับการจอง miraDry อื่นในช่วงเวลาที่แพทย์ว่าง (Stage 2: Prep)\nคุณต้องการดำเนินการจองต่อหรือไม่?'
            : ''
        }
        onConfirm={async () => {
          // Set force booking flag and retry
          setForceBooking(true);
          setWarningDialog({ open: false, warnings: [] });

          // Re-validate with force flag
          setTimeout(async () => {
            await handleValidateBooking();
            // If validation passes, proceed to confirm
            if (validationResult?.success && !validationResult?.requiresConfirmation) {
              await handleConfirmBooking();
            }
          }, 100);
        }}
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
