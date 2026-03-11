import { UserRole, MachineType, BookingStatus } from '../constants/app';

// Re-export for convenience
export { UserRole, MachineType, BookingStatus };

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  isActive: boolean;
}

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  isAvailable: boolean;
  roomId?: string; // Legacy: primary room ID
  roomIds?: string[]; // New: list of all compatible room IDs
}

export interface Room {
  id: string;
  name: string;
  isAvailable: boolean;
  room_type?: 'PREP' | 'TREATMENT' | 'CONSULTATION' | 'PROCEDURE' | 'MEETING' | 'BOTH';
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  isAvailable: boolean;
}

export interface Procedure {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  is_active?: boolean;
  requires_prep_room?: boolean; // Whether this procedure needs a prep room
  prep_duration_minutes?: number; // Duration of prep stage
}

export interface Booking {
  id: string;
  doctorId: string;
  machineId: string;
  roomId: string;
  prepRoomId?: string; // Prep room for 2-stage bookings
  prepStartTime?: string; // Prep stage start time
  prepEndTime?: string; // Prep stage end time
  date: Date;
  startTime: string; // Treatment start time
  endTime: string; // Treatment end time
  patientName: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  createdBy: string;
  createdAt: Date;
  procedures?: Procedure[]; // Many-to-many relationship
  booking_type?: 'PROCEDURE' | 'MEETING';
}

export interface BookingValidationResult {
  success: boolean;
  message: string;
  errors?: string[];
}
