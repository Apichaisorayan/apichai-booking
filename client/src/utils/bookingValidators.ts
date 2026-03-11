/**
 * ============================================
 * Booking Validators
 * ============================================
 * 
 * Client-side validation utilities for bookings
 * Provides quick validation before API calls
 * 
 * @module bookingValidators
 */

import type { BookingFormState } from '../hooks/useBookingForm';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate patient name
 */
export const validatePatientName = (name: string): ValidationError | null => {
  if (!name || !name.trim()) {
    return {
      field: 'patientName',
      message: 'กรุณากรอกชื่อผู้ป่วย',
    };
  }
  return null;
};

/**
 * Validate time range
 */
export const validateTimeRange = (startTime: string, endTime: string): ValidationError | null => {
  if (!startTime || !endTime) {
    return {
      field: 'time',
      message: 'กรุณาเลือกเวลา',
    };
  }

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  if (endTotalMinutes <= startTotalMinutes) {
    return {
      field: 'time',
      message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น',
    };
  }

  return null;
};

/**
 * Validate required resources
 */
export const validateRequiredResources = (
  formState: BookingFormState
): ValidationError | null => {
  const { selectedMachine, selectedRoom, selectedDoctor, isDoctorOptional } = formState;

  if (!selectedMachine) {
    return {
      field: 'machine',
      message: 'กรุณาเลือกเครื่อง',
    };
  }

  if (!selectedRoom) {
    return {
      field: 'room',
      message: 'กรุณาเลือกห้อง',
    };
  }

  if (!isDoctorOptional && !selectedDoctor) {
    return {
      field: 'doctor',
      message: 'กรุณาเลือกแพทย์',
    };
  }

  return null;
};

/**
 * Validate prep room requirement
 */
export const validatePrepRoom = (formState: BookingFormState): ValidationError | null => {
  const { requiresPrepRoom, selectedPrepRoom } = formState;

  if (requiresPrepRoom && !selectedPrepRoom) {
    return {
      field: 'prepRoom',
      message: 'กรุณาเลือกห้องเตรียมตัว',
    };
  }

  return null;
};

/**
 * Validate consult room requirement (for 3-stage)
 */
export const validateConsultRoom = (formState: BookingFormState): ValidationError | null => {
  const { isThreeStage, selectedConsultRoom } = formState;

  if (isThreeStage && !selectedConsultRoom) {
    return {
      field: 'consultRoom',
      message: 'กรุณาเลือกห้องปรึกษา',
    };
  }

  return null;
};

/**
 * Validate all booking fields
 * Returns array of validation errors
 */
export const validateBookingForm = (
  formState: BookingFormState,
  patientName: string
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Validate patient name
  const patientNameError = validatePatientName(patientName);
  if (patientNameError) errors.push(patientNameError);

  // Validate time range
  const timeError = validateTimeRange(formState.startTime, formState.endTime);
  if (timeError) errors.push(timeError);

  // Validate required resources
  const resourcesError = validateRequiredResources(formState);
  if (resourcesError) errors.push(resourcesError);

  // Validate prep room
  const prepRoomError = validatePrepRoom(formState);
  if (prepRoomError) errors.push(prepRoomError);

  // Validate consult room
  const consultRoomError = validateConsultRoom(formState);
  if (consultRoomError) errors.push(consultRoomError);

  return errors;
};

/**
 * Check if form is ready for validation
 */
export const isFormReadyForValidation = (formState: BookingFormState): boolean => {
  const {
    selectedDoctor,
    selectedMachine,
    selectedRoom,
    selectedPrepRoom,
    selectedConsultRoom,
    isDoctorOptional,
    requiresPrepRoom,
    isThreeStage,
  } = formState;

  // Check basic requirements
  if (!selectedMachine || !selectedRoom) {
    return false;
  }

  // Check doctor requirement
  if (!isDoctorOptional && !selectedDoctor) {
    return false;
  }

  // Check prep room requirement
  if (requiresPrepRoom && !selectedPrepRoom) {
    return false;
  }

  // Check consult room requirement
  if (isThreeStage && !selectedConsultRoom) {
    return false;
  }

  return true;
};
