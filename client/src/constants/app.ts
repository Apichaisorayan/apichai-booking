// ============================================
// Application Constants
// Centralize all magic numbers and config values
// ============================================

// Business Hours
export const BUSINESS_HOURS = {
  START: '09:00',
  END: '20:00',
  START_HOUR: 9,
  END_HOUR: 20,
  MAX_END: '21:00',
} as const;

// User Roles
export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  SALES = 'SALES',
  CRM = 'CRM',
}

// Machine Types
export enum MachineType {
  MOVABLE = 'MOVABLE',
  FIXED = 'FIXED',
}

// Room Types
export enum RoomType {
  PROCEDURE = 'PROCEDURE',
  MEETING = 'MEETING',
  BOTH = 'BOTH',
}

// Booking Status
export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

// Validation Messages
export const VALIDATION_MESSAGES = {
  MISSING_FIELDS: 'กรุณากรอกข้อมูลให้ครบถ้วน',
  INVALID_TIME: 'เวลาไม่ถูกต้อง',
  BOOKING_CONFLICT: 'มีการจองซ้ำในช่วงเวลานี้',
  RESOURCE_UNAVAILABLE: 'ทรัพยากรไม่พร้อมใช้งาน',
} as const;

// Time Slots
export const generateTimeSlots = () => {
  const slots = [];
  for (let hour = BUSINESS_HOURS.START_HOUR; hour <= BUSINESS_HOURS.END_HOUR; hour++) {
    const startHour = hour;
    const endHour = hour + 1;
    const startTime = `${startHour.toString().padStart(2, '0')}:00`;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;
    const period = startHour < 12 ? 'AM' : 'PM';
    const displayHour = startHour > 12 ? startHour - 12 : startHour;

    slots.push({
      startTime,
      endTime,
      display: `${displayHour}:00 ${period}`,
      hour: startHour,
    });
  }
  return slots;
};
