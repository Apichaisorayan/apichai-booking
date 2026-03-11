// ============================================
// API Response Types
// ============================================

export interface ApiDoctor {
  id: string;
  name: string;
  specialty: string;
  is_available: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiMachine {
  id: string;
  name: string;
  type: 'MOVABLE' | 'FIXED';
  is_available: number | boolean;
  room_id: string | null;
  room_ids?: string; // Comma-separated IDs from backend
  created_at: string;
  updated_at: string;
  rooms?: {
    id: string;
    name: string;
  } | null;
}

export interface ApiRoom {
  id: string;
  name: string;
  is_available: number | boolean;
  room_type?: 'PREP' | 'TREATMENT';
  created_at: string;
  updated_at: string;
}

export interface ApiBooking {
  id: string;
  doctor_id: string;
  machine_id: string;
  room_id: string;
  patient_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  doctors?: {
    id: string;
    name: string;
    specialty: string;
  };
  machines?: {
    id: string;
    name: string;
    type: string;
  };
  rooms?: {
    id: string;
    name: string;
  };
  users?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: 'DOCTOR' | 'SALES' | 'CRM';
  is_available: number | boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// API Request Types
// ============================================

export interface CreateBookingRequest {
  doctor_id: string;
  machine_id: string;
  room_id: string;
  patient_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status?: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
  created_by?: string;
}

export interface ValidateBookingRequest {
  doctor_id: string;
  machine_id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

export interface CheckAvailabilityRequest {
  date: string;
  start_time: string;
  end_time: string;
}

// ============================================
// API Response Wrappers
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationResponse {
  success: boolean;
  message: string;
  errors?: string[];
}

export interface AvailabilityResponse {
  success: boolean;
  unavailable: {
    doctors: string[];
    machines: string[];
    rooms: string[];
  };
}
