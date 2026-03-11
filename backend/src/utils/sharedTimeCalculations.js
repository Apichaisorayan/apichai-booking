/**
 * ============================================
 * Shared Time Calculation Functions
 * ============================================
 * 
 * Time calculation logic shared between client and server
 * Should match client/src/utils/sharedTimeCalculations.ts
 * 
 * @module sharedTimeCalculations
 */

import { MIRADRY_DURATIONS } from './sharedBookingRules.js';

/**
 * Format minutes to HH:MM
 * @param {number} totalMinutes - Total minutes
 * @returns {string} Time in HH:MM format
 */
const formatTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Parse HH:MM to total minutes
 * @param {string} time - Time in HH:MM format
 * @returns {number} Total minutes
 */
const parseTime = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Calculate busy blocks for doctor in a 3-stage booking
 * Stage 1: T to T+30 (Busy)
 * Stage 2: T+30 to T+60 (Free) ← แพทย์ว่าง สามารถรับนัดอื่นได้
 * Stage 3: T+60 to T+180 (Busy)
 * 
 * @param {string} startTime - Start time in HH:MM format
 * @returns {Array<{start: string, end: string}>} Array of busy blocks
 */
/**
 * Calculate busy blocks for doctor in a 3-stage booking
 * 
 * @param {string} startTime - Overall anchor start time in HH:MM format
 * @param {boolean} [includeConsult=true] - Whether consultation is included
 * @returns {Array<{start: string, end: string}>} Array of busy blocks
 */
export const calculateThreeStageDoctorBusyBlocks = (startTime, includeConsult = true) => {
  const startTotal = parseTime(startTime);
  const consultDuration = includeConsult ? MIRADRY_DURATIONS.CONSULT : 0;

  const blocks = [];

  if (includeConsult) {
    blocks.push({
      start: startTime,
      end: formatTime(startTotal + consultDuration), // Stage 1: Consult (Busy)
    });
  }

  blocks.push({
    start: formatTime(startTotal + consultDuration + MIRADRY_DURATIONS.PREP),
    end: formatTime(startTotal + consultDuration + MIRADRY_DURATIONS.PREP + MIRADRY_DURATIONS.TREATMENT_DOCTOR), // Stage 3: Treatment Start (Doctor only busy for first 30m)
  });

  return blocks;
};

/**
 * Calculate FREE block for doctor in a 3-stage booking
 * 
 * @param {string} startTime - Overall anchor start time in HH:MM format
 * @param {boolean} [includeConsult=true] - Whether consultation is included
 * @returns {{start: string, end: string}} Free block
 */
export const calculateThreeStageDoctorFreeBlock = (startTime, includeConsult = true) => {
  const startTotal = parseTime(startTime);
  const consultDuration = includeConsult ? MIRADRY_DURATIONS.CONSULT : 0;

  return {
    start: formatTime(startTotal + consultDuration), // Stage 2 start (after consult or at start)
    end: formatTime(startTotal + consultDuration + MIRADRY_DURATIONS.PREP), // Stage 2 end (before treatment)
  };
};

/**
 * Calculate all 3-stage times (consult, prep, treatment)
 * 
 * @param {string} startTime - Overall anchor start time in HH:MM format
 * @param {number} [treatmentDuration=MIRADRY_DURATIONS.TREATMENT] - Duration of treatment stage
 * @param {boolean} [includeConsult=true] - Whether consultation is included
 * @returns {Object} Object with all stage times
 */
export const calculateThreeStageTimes = (startTime, treatmentDuration = MIRADRY_DURATIONS.TREATMENT, includeConsult = true) => {
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
 * @param {string} bookingStart - Start time of new booking (HH:MM)
 * @param {string} bookingEnd - End time of new booking (HH:MM)
 * @param {string} threeStageStart - Start time of 3-stage booking (HH:MM)
 * @param {boolean} [includeConsult=true] - Whether consultation is included
 * @returns {boolean} True if booking fits completely in the FREE window
 */
export const canFitInThreeStageFreeWindow = (bookingStart, bookingEnd, threeStageStart, includeConsult = true) => {
  const freeBlock = calculateThreeStageDoctorFreeBlock(threeStageStart, includeConsult);
  return bookingStart >= freeBlock.start && bookingEnd <= freeBlock.end;
};

/**
 * Get the anchor (overall start) time for a 3-stage booking.
 * 
 * @param {Object} booking - Booking object
 * @returns {string} Overall start time (HH:MM)
 */
export const getThreeStageAnchorTime = (booking) => {
  // 1. Prefer explicit consult_start_time if available
  if (booking.consult_start_time) {
    const time = booking.consult_start_time;
    return time.length > 5 ? time.substring(0, 5) : time;
  }


  const treatmentStart = booking.start_time.length > 5 ? booking.start_time.substring(0, 5) : booking.start_time;
  const startTotal = parseTime(treatmentStart);

  // If there's no consult room or start time, assume no consult
  if (!booking.consult_room_id && !booking.consult_start_time) {
    const anchorTotal = startTotal - MIRADRY_DURATIONS.PREP;
    return formatTime(anchorTotal);
  }

  // 3. Fallback: Calculate backwards from start_time (Treatment Start)
  const anchorTotal = startTotal - (MIRADRY_DURATIONS.CONSULT + MIRADRY_DURATIONS.PREP);
  return formatTime(anchorTotal);
};
