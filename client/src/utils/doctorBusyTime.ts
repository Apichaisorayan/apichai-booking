/**
 * ============================================
 * Doctor Busy Time Calculator
 * ============================================
 * 
 * Calculates when doctor is actually BUSY based on procedure type
 * Different procedures have different busy patterns
 * 
 * @module doctorBusyTime
 */

import { MIRADRY_DURATIONS } from '../constants/sharedBookingRules';

export interface DoctorBusyTimeResult {
  startTime: string;
  endTime: string;
  isBusy: boolean;
  busyBlocks?: Array<{ start: string; end: string }>; // For 3-stage procedures
}

/**
 * Check if procedures include miraDry (3-stage)
 */
const isMiraDryProcedure = (procedureNames: string[]): boolean => {
  return procedureNames.some(name => {
    const lowerName = name.toLowerCase();
    return !lowerName.includes('f/u') && lowerName.includes('miradry');
  });
};

/**
 * Check if procedures include Ulthera or other prep-required procedures
 */
const requiresPrepRoom = (procedureNames: string[]): boolean => {
  const prepKeywords = ['ulthera', 'thermage', 'laser'];
  return procedureNames.some(name =>
    prepKeywords.some(keyword => name.toLowerCase().includes(keyword))
  );
};

/**
 * Calculate doctor busy time based on booking data
 * 
 * Rules:
 * 1. miraDry (3-stage): Doctor BUSY during Stage 1 (Consult) and Stage 3 (Treatment)
 *    - Stage 1: consultStartTime → consultEndTime
 *    - Stage 2: FREE (prep)
 *    - Stage 3: prepEndTime → endTime
 *    Display: Stage 3 only (prepEndTime → endTime)
 * 
 * 2. Ulthera/Thermage (2-stage with prep): Doctor BUSY during Treatment only
 *    - Stage 1: Prep (staff handles)
 *    - Stage 2: Treatment (doctor)
 *    Display: prepEndTime → endTime
 * 
 * 3. Standard procedures: Doctor BUSY entire duration
 *    Display: startTime → endTime
 * 
 * @param booking - Booking data with times and procedures
 * @returns Doctor busy time range
 */
export const calculateDoctorBusyTime = (booking: {
  procedures?: Array<{ name: string }>;
  consultStartTime?: string;
  consultEndTime?: string;
  prepStartTime?: string;
  prepEndTime?: string;
  startTime: string;
  endTime: string;
}): DoctorBusyTimeResult => {
  const procedureNames = booking.procedures?.map(p => p.name) || [];

  // Case 1: miraDry (3-stage)
  // Doctor BUSY: Stage 1 (Consult) + Stage 3 (Treatment)
  // Display: Stage 3 only (prepEndTime → prepEndTime + 30m)
  if (isMiraDryProcedure(procedureNames)) {
    if (booking.prepEndTime && booking.consultStartTime && booking.consultEndTime) {
      // Helper to add minutes
      const addMinutes = (time: string, minutes: number): string => {
        const [h, m] = time.split(':').map(Number);
        const total = h * 60 + m + minutes;
        const newH = Math.floor(total / 60);
        const newM = total % 60;
        return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
      };

      // Calculate end time for Doctor Busy (Stage 3)
      // Treatment starts at prepEndTime, Doctor is busy for TREATMENT_DOCTOR minutes (30m)
      const doctorBusyEndTime = addMinutes(booking.prepEndTime, MIRADRY_DURATIONS.TREATMENT_DOCTOR);

      return {
        startTime: booking.prepEndTime,
        endTime: doctorBusyEndTime,
        isBusy: true,
        busyBlocks: [
          { start: booking.consultStartTime, end: booking.consultEndTime }, // Stage 1: Consult
          { start: booking.prepEndTime, end: doctorBusyEndTime }, // Stage 3: Treatment (Doctor part)
        ],
      };
    }
  }

  // Case 2: Ulthera/Thermage (2-stage with prep)
  // Doctor BUSY: Treatment stage only (prepEndTime → endTime)
  if (requiresPrepRoom(procedureNames)) {
    if (booking.prepEndTime) {
      return {
        startTime: booking.prepEndTime,
        endTime: booking.endTime,
        isBusy: true,
      };
    }
  }

  // Case 3: Standard procedures
  // Doctor BUSY: Entire duration (startTime → endTime)
  return {
    startTime: booking.startTime,
    endTime: booking.endTime,
    isBusy: true,
  };
};

/**
 * Calculate doctor FREE time for miraDry (Stage 2)
 * Returns null if not miraDry or no FREE window
 */
export const calculateDoctorFreeTime = (booking: {
  procedures?: Array<{ name: string }>;
  consultEndTime?: string;
  prepEndTime?: string;
}): { startTime: string; endTime: string } | null => {
  const procedureNames = booking.procedures?.map(p => p.name) || [];

  // Only miraDry has FREE window (Stage 2)
  if (isMiraDryProcedure(procedureNames)) {
    if (booking.consultEndTime && booking.prepEndTime) {
      return {
        startTime: booking.consultEndTime,
        endTime: booking.prepEndTime,
      };
    }
  }

  return null;
};

/**
 * Get display label for doctor busy time
 */
export const getDoctorBusyLabel = (booking: {
  procedures?: Array<{ name: string }>;
}): string => {
  const procedureNames = booking.procedures?.map(p => p.name) || [];

  if (isMiraDryProcedure(procedureNames)) {
    return 'แพทย์ไม่ว่าง (Busy) - Stage 3';
  }

  if (requiresPrepRoom(procedureNames)) {
    return 'แพทย์ไม่ว่าง (Busy) - Treatment';
  }

  return 'แพทย์ไม่ว่าง (Busy)';
};

/**
 * Format time range for display
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  const start = startTime.substring(0, 5);
  const end = endTime.substring(0, 5);
  return `${start} - ${end}`;
};
