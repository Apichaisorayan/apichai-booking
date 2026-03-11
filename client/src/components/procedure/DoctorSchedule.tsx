import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { usersApi, bookingsApi, machinesApi, roomsApi } from "../lib/api";

interface Doctor {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Booking {
  id: string;
  doctor_id: string;
  machine_id: string;
  room_id: string;
  patient_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  doctors?: { name: string };
  machines?: { name: string };
  rooms?: { name: string };
}

interface TimeSlot {
  time: string;
  hour: number;
  available: boolean;
  booking?: Booking;
}

export function DoctorSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    patient_name: "",
    machine_id: "",
    room_id: "",
    notes: "",
  });

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];

  const thaiDays = [
    "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ",
    "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์",
  ];

  // เวลาทำงาน 8 ชั่วโมง (09:00 - 17:00)
  const workingHours = Array.from({ length: 8 }, (_, i) => i + 9);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [usersData, bookingsData, machinesData, roomsData] = await Promise.all([
        usersApi.getAll(),
        bookingsApi.getAll(),
        machinesApi.getAll(),
        roomsApi.getAll(),
      ]);

      // Filter only doctors
      const doctorsData = (usersData as any[]).filter((user: any) => user.role === "DOCTOR");
      setDoctors(doctorsData);

      // Set first doctor as selected if not set
      if (!selectedDoctor && doctorsData.length > 0) {
        setSelectedDoctor(doctorsData[0].id);
      }

      setBookings(bookingsData as Booking[]);
      setMachines(machinesData as any[]);
      setRooms(roomsData as any[]);
    } catch (error: any) {
      toast.error("ไม่สามารถโหลดข้อมูลได้: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = () => {
    const day = thaiDays[currentDate.getDay()];
    const date = currentDate.getDate();
    const month = thaiMonths[currentDate.getMonth()];
    const year = currentDate.getFullYear() + 543;
    return `${day}ที่ ${date} ${month} ${year}`;
  };

  const isToday = () => {
    const today = new Date();
    return (
      currentDate.getDate() === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const getBookingForTimeSlot = (hour: number): Booking | undefined => {
    const dateStr = currentDate.toISOString().split("T")[0];
    const timeStr = `${String(hour).padStart(2, "0")}:00:00`;

    return bookings.find((booking) => {
      if (booking.date !== dateStr || booking.doctor_id !== selectedDoctor) return false;
      if (booking.status === "CANCELLED") return false;

      const slotStart = timeToMinutes(timeStr);
      const slotEnd = slotStart + 60;
      const bookingStart = timeToMinutes(booking.start_time);
      const bookingEnd = timeToMinutes(booking.end_time);

      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  };

  const getTimeSlots = (): TimeSlot[] => {
    return workingHours.map((hour) => {
      const booking = getBookingForTimeSlot(hour);
      return {
        time: `${String(hour).padStart(2, "0")}:00`,
        hour,
        available: !booking,
        booking,
      };
    });
  };

  const timeSlots = getTimeSlots();
  const availableSlots = timeSlots.filter((slot) => slot.available).length;
  const bookedSlots = timeSlots.filter((slot) => !slot.available).length;

  const handleTimeSlotClick = (slot: TimeSlot) => {
    if (slot.available) {
      setSelectedTimeSlot(slot);
      setFormData({
        patient_name: "",
        machine_id: "",
        room_id: "",
        notes: "",
      });
      setIsDialogOpen(true);
    } else {
      toast.info("ช่วงเวลานี้ไม่ว่าง", {
        description: `ผู้ป่วย: ${slot.booking?.patient_name}`,
      });
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_name || !formData.machine_id || !formData.room_id) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      const dateStr = currentDate.toISOString().split("T")[0];
      const startTime = `${selectedTimeSlot?.time}:00`;
      const endTime = `${String(selectedTimeSlot!.hour + 1).padStart(2, "0")}:00:00`;

      await bookingsApi.create({
        doctor_id: selectedDoctor,
        machine_id: formData.machine_id,
        room_id: formData.room_id,
        patient_name: formData.patient_name,
        date: dateStr,
        start_time: startTime,
        end_time: endTime,
        notes: formData.notes,
      });

      toast.success("จองนัดหมายสำเร็จ!", {
        description: `จองเวลา ${selectedTimeSlot?.time} สำหรับ ${selectedDoctorData?.name}`,
      });

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("ไม่สามารถจองนัดหมายได้: " + error.message);
    }
  };

  const selectedDoctorData = doctors.find((d) => d.id === selectedDoctor);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">ไม่มีแพทย์ในระบบ</p>
          <p className="text-gray-400 text-sm mt-1">กรุณาเพิ่มแพทย์ในระบบก่อน</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* Doctor Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#c5a059]" />
            <Label>เลือกแพทย์:</Label>
          </div>
          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  <div className="flex flex-col">
                    <span>{doctor.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {doctor.email}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 ml-auto">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              ว่าง {availableSlots} ช่วง
            </Badge>
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200"
            >
              <XCircle className="h-3 w-3 mr-1" />
              ไม่ว่าง {bookedSlots} ช่วง
            </Badge>
          </div>
        </div>
      </Card>

      {/* Date Navigation */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={goToToday} variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              วันนี้
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={goToPreviousDay}
                variant="outline"
                size="icon"
                className="h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[300px] text-center">
                <div className={isToday() ? "text-[#c5a059]" : ""}>
                  {formatDate()}
                </div>
              </div>
              <Button
                onClick={goToNextDay}
                variant="outline"
                size="icon"
                className="h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Schedule Grid */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg">ตารางเวลา: {selectedDoctorData?.name}</h3>
              <p className="text-sm text-muted-foreground">
                เวลาทำงาน: 09:00 - 17:00 น. (8 ชั่วโมง)
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              คลิกที่ช่วงเวลาสีเขียวเพื่อจองนัดหมาย
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {timeSlots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => handleTimeSlotClick(slot)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  slot.available
                    ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 cursor-pointer"
                    : "border-red-200 bg-red-50 cursor-not-allowed opacity-75"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock
                      className={`h-4 w-4 ${
                        slot.available ? "text-emerald-600" : "text-red-600"
                      }`}
                    />
                    <span
                      className={
                        slot.available ? "text-emerald-900" : "text-red-900"
                      }
                    >
                      {slot.time} - {String(slot.hour + 1).padStart(2, "0")}:00
                    </span>
                  </div>
                  {slot.available ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                {slot.available ? (
                  <div className="text-sm text-emerald-700">
                    ว่าง - คลิกเพื่อจอง
                  </div>
                ) : (
                  <div className="text-sm text-red-700">
                    <div className="truncate">{slot.booking?.patient_name}</div>
                    <div className="text-xs truncate mt-1">
                      {slot.booking?.machines?.name || "N/A"}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Booking Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>จองนัดหมายใหม่</DialogTitle>
            <DialogDescription>
              จองนัดหมายสำหรับ {selectedDoctorData?.name} เวลา{" "}
              {selectedTimeSlot?.time} -{" "}
              {selectedTimeSlot &&
                String(selectedTimeSlot.hour + 1).padStart(2, "0")}
              :00
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBookAppointment} className="space-y-4 py-4">
            <div className="p-4 bg-[#c5a059]/10 rounded-lg border border-[#c5a059]/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#c5a059]" />
                <div>
                  <div className="text-sm">
                    <strong>แพทย์:</strong> {selectedDoctorData?.name}
                  </div>
                  <div className="text-sm">
                    <strong>วันที่:</strong> {formatDate()}
                  </div>
                  <div className="text-sm">
                    <strong>เวลา:</strong> {selectedTimeSlot?.time} -{" "}
                    {selectedTimeSlot &&
                      String(selectedTimeSlot.hour + 1).padStart(2, "0")}
                    :00 น.
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient">ชื่อผู้ป่วย *</Label>
              <Input
                id="patient"
                placeholder="กรอกชื่อผู้ป่วย"
                value={formData.patient_name}
                onChange={(e) =>
                  setFormData({ ...formData, patient_name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="machine">เครื่องมือ *</Label>
              <Select
                value={formData.machine_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, machine_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเครื่องมือ" />
                </SelectTrigger>
                <SelectContent>
                  {machines
                    .filter((m) => m.is_available)
                    .map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">ห้อง *</Label>
              <Select
                value={formData.room_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, room_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกห้อง" />
                </SelectTrigger>
                <SelectContent>
                  {rooms
                    .filter((r) => r.is_available)
                    .map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">รายละเอียดเพิ่มเติม</Label>
              <Textarea
                id="notes"
                placeholder="ข้อมูลเพิ่มเติม..."
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-[#c5a059] hover:bg-[#008a8f]"
              >
                ยืนยันการจอง
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
