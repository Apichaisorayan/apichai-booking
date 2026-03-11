/**
 * ============================================
 * Shared Time Calculation Functions
 * ============================================
 * 
 * Time calculation logic shared between client and server
 * Should match backend/src/utils/sharedTimeCalculations.js
 * 
 * @module sharedTimeCalculations
 */

import { MIRADRY_DURATIONS } from '../constants/sharedBookingRules';

/**
 * Format minutes to HH:MM
 */
const formatTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Parse HH:MM to total minutes
 */
const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Calculate busy blocks for doctor in a 3-stage booking
 * Stage 1: T to T+30 (Busy)
 * Stage 2: T+30 to T+60 (Free) ← แพทย์ว่าง สามารถรับนัดอื่นได้
 * Stage 3: T+60 to T+180 (Busy)
 * 
 * @param startTime - Start time in HH:MM format
 * @returns Array of busy blocks with start and end times
 */
export const calculateThreeStageDoctorBusyBlocks = (startTime: string): Array<{ start: string; end: string }> => {
  const startTotal = parseTime(startTime);

  return [
    {
      start: startTime,
      end: formatTime(startTotal + MIRADRY_DURATIONS.CONSULT), // Stage 1: Consult (Busy)
    },
    {
      start: formatTime(startTotal + MIRADRY_DURATIONS.CONSULT + MIRADRY_DURATIONS.PREP),
      end: formatTime(startTotal + MIRADRY_DURATIONS.CONSULT + MIRADRY_DURATIONS.PREP + MIRADRY_DURATIONS.TREATMENT_DOCTOR), // Stage 3: Treatment Start (Doctor only busy for first 30m)
    },
  ];
};

/**
 * Calculate FREE block for doctor in a 3-stage booking
 * Returns the time window when doctor is available for other bookings
 * 
 * @param startTime - Start time in HH:MM format
 * @returns Free block with start and end times
 */
export const calculateThreeStageDoctorFreeBlock = (startTime: string): { start: string; end: string } => {
  const startTotal = parseTime(startTime);

  return {
    start: formatTime(startTotal + MIRADRY_DURATIONS.CONSULT), // Stage 2 start (after consult)
    end: formatTime(startTotal + MIRADRY_DURATIONS.CONSULT + MIRADRY_DURATIONS.PREP), // Stage 2 end (before treatment)
  };
};

/**
 * Calculate all 3-stage times (consult, prep, treatment)
 * 
 * @param startTime - Start time in HH:MM format
 * @returns Object with all stage times
 */
export const calculateThreeStageTimes = (
  startTime: string,
  treatmentDuration: number = MIRADRY_DURATIONS.TREATMENT,
  includeConsult: boolean = true
) => {
  const startTotal = parseTime(startTime);

  const consultDuration = includeConsult ? MIRADRY_DURATIONS.CONSULT : 0;
  const consultEndTime = startTotal + consultDuration;
  const prepEndTime = consultEndTime + MIRADRY_DURATIONS.PREP;
  const treatmentEndTime = prepEndTime + treatmentDuration;

  return {
    consultStartTime: includeConsult ? startTime : undefined,
    consultEndTime: includeConsult ? formatTime(consultEndTime) : undefined,
    prepStartTime: formatTime(consultEndTime),
    prepEndTime: formatTime(prepEndTime),
    treatmentStartTime: formatTime(prepEndTime),
    treatmentEndTime: formatTime(treatmentEndTime),
  };
};

/**
 * Check if a booking can fit in the FREE window of a 3-stage procedure
 * 
 * @param bookingStart - Start time of new booking (HH:MM)
 * @param bookingEnd - End time of new booking (HH:MM)
 * @param threeStageStart - Start time of 3-stage booking (HH:MM)
 * @returns True if booking fits completely in the FREE window
 */
export const canFitInThreeStageFreeWindow = (
  bookingStart: string,
  bookingEnd: string,
  threeStageStart: string
): boolean => {
  const freeBlock = calculateThreeStageDoctorFreeBlock(threeStageStart);

  // New booking must start at or after free block start
  // AND end at or before free block end
  return bookingStart >= freeBlock.start && bookingEnd <= freeBlock.end;
};
