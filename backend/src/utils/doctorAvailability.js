/**
 * ============================================
 * Doctor Availability Checker for 3-Stage Bookings
 * ============================================
 * 
 * Handles smart overlap detection for miraDry (3-stage) bookings
 * where doctors are FREE during Stage 2 (Prep) and can take other appointments.
 * 
 * @module doctorAvailability
 */

import { isThreeStageProcedure, calculateThreeStageDoctorBusyBlocks, calculateThreeStageDoctorFreeBlock, getThreeStageAnchorTime } from './bookingHelper.js';
import { timeRangesOverlap } from './availability.js';
import { normalizeTime } from './timeFormat.js';

/**
 * Check if a booking fits completely within a FREE window
 * @param {string} bookingStart - Start time (HH:MM or HH:MM:SS)
 * @param {string} bookingEnd - End time (HH:MM or HH:MM:SS)
 * @param {Object} freeBlock - Free block with {start, end}
 * @returns {boolean}
 */
const fitsInFreeWindow = (bookingStart, bookingEnd, freeBlock) => {
  const start = normalizeTime(bookingStart);
  const end = normalizeTime(bookingEnd);
  return start >= freeBlock.start && end <= freeBlock.end;
};

/**
 * Check if NEW booking can fit in EXISTING 3-stage booking's FREE window
 * @param {Object} newBooking - {start_time, end_time, isThreeStage}
 * @param {Object} existingBooking - {start_time, end_time, isThreeStage}
 * @returns {boolean} True if allowed (no conflict)
 */
const canNewFitInExistingFreeWindow = (newBooking, existingBooking) => {
  if (!existingBooking.isThreeStage || newBooking.isThreeStage) {
    return false; // Only check if existing is 3-stage and new is not
  }

  const anchorTime = getThreeStageAnchorTime(existingBooking);
  const freeBlock = calculateThreeStageDoctorFreeBlock(anchorTime, existingBooking.includeConsult);
  const fits = fitsInFreeWindow(newBooking.start_time, newBooking.end_time, freeBlock);

  return fits;
};

/**
 * Check if EXISTING booking can fit in NEW 3-stage booking's FREE window
 * @param {Object} newBooking - {start_time, end_time, isThreeStage}
 * @param {Object} existingBooking - {start_time, end_time, isThreeStage}
 * @returns {boolean} True if allowed (no conflict)
 */
const canExistingFitInNewFreeWindow = (newBooking, existingBooking) => {
  if (!newBooking.isThreeStage || existingBooking.isThreeStage) {
    return false; // Only check if new is 3-stage and existing is not
  }

  const anchorTime = getThreeStageAnchorTime(newBooking);
  const freeBlock = calculateThreeStageDoctorFreeBlock(anchorTime, newBooking.includeConsult);
  const fits = fitsInFreeWindow(existingBooking.start_time, existingBooking.end_time, freeBlock);

  return fits;
};

/**
 * Check if two bookings have doctor conflict
 * Handles smart overlap detection for 3-stage bookings
 * 
 * @param {Object} newBooking - New booking to validate
 * @param {Object} existingBooking - Existing booking to check against
 * @returns {boolean} True if there is a conflict
 */
export const hasDoctorConflict = (newBooking, existingBooking) => {
  // Different doctors = no conflict
  if (newBooking.doctor_id !== existingBooking.doctor_id) {
    return false;
  }

  // 🎯 SMART OVERLAP DETECTION
  // Check if NEW booking fits in EXISTING 3-stage FREE window
  if (canNewFitInExistingFreeWindow(newBooking, existingBooking)) {
    return false; // No conflict
  }

  // Check if EXISTING booking fits in NEW 3-stage FREE window
  if (canExistingFitInNewFreeWindow(newBooking, existingBooking)) {
    return false; // No conflict
  }

  // Calculate busy intervals
  const newBusyIntervals = newBooking.isThreeStage
    ? calculateThreeStageDoctorBusyBlocks(getThreeStageAnchorTime(newBooking), newBooking.includeConsult)
    : [{ start: newBooking.start_time, end: newBooking.end_time }];

  const existingBusyIntervals = existingBooking.isThreeStage
    ? calculateThreeStageDoctorBusyBlocks(getThreeStageAnchorTime(existingBooking), existingBooking.includeConsult)
    : [{ start: existingBooking.start_time, end: existingBooking.end_time }];

  // Check if any busy intervals overlap
  const hasOverlap = newBusyIntervals.some(newIv =>
    existingBusyIntervals.some(exIv =>
      timeRangesOverlap(newIv.start, newIv.end, exIv.start, exIv.end)
    )
  );

  if (hasOverlap) {
    console.log('  ❌ Busy intervals overlap - CONFLICT');
  }

  return hasOverlap;
};

/**
 * Build detailed error message for doctor conflict
 * @param {Object} doctor - Doctor object with name
 * @param {Object} existingBooking - Conflicting booking
 * @returns {string} Error message
 */
export const buildDoctorConflictMessage = (doctor, existingBooking) => {
  const doctorName = doctor?.name || 'แพทย์';
  let message = `แพทย์ ${doctorName} ไม่ว่างในช่วงเวลาที่เลือก`;

  if (existingBooking.isThreeStage) {
    const anchorTime = getThreeStageAnchorTime(existingBooking);
    const freeBlock = calculateThreeStageDoctorFreeBlock(anchorTime, existingBooking.includeConsult);
    message += ` (มี miraDry ${normalizeTime(anchorTime)}-${normalizeTime(existingBooking.end_time)}, แพทย์ว่างเฉพาะ ${freeBlock.start}-${freeBlock.end})`;
  } else {
    message += ` (มีนัดหมาย ${normalizeTime(existingBooking.start_time)}-${normalizeTime(existingBooking.end_time)})`;
  }

  return message;
};

/**
 * Check doctor availability for a new booking against all existing bookings
 * @param {Object} newBooking - New booking to validate
 * @param {Array} existingBookings - Array of existing bookings
 * @returns {Object} {hasConflict: boolean, conflictingBooking: Object|null}
 */
export const checkDoctorAvailability = (newBooking, existingBookings) => {
  if (!newBooking.doctor_id) {
    return { hasConflict: false, conflictingBooking: null };
  }

  console.log('🔍 Checking doctor availability:', {
    doctor_id: newBooking.doctor_id,
    isThreeStage: newBooking.isThreeStage,
    start_time: newBooking.start_time,
    end_time: newBooking.end_time
  });

  for (const existing of existingBookings) {
    if (hasDoctorConflict(newBooking, existing)) {
      return { hasConflict: true, conflictingBooking: existing };
    }
  }

  return { hasConflict: false, conflictingBooking: null };
};
