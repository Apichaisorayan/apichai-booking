import { normalizeTime } from './timeFormat.js';
import {
  STAFF_ONLY_KEYWORDS,
  THREE_STAGE_PROCEDURE_KEYWORDS,
  isThreeStageProcedureName
} from './sharedBookingRules.js';
import {
  calculateThreeStageDoctorBusyBlocks,
  calculateThreeStageDoctorFreeBlock,
  getThreeStageAnchorTime,
  canFitInThreeStageFreeWindow as sharedCanFitInFreeWindow
} from './sharedTimeCalculations.js';

/**
 * Shared booking logic for Backend
 */

// Re-export for backward compatibility
export { STAFF_ONLY_KEYWORDS, THREE_STAGE_PROCEDURE_KEYWORDS };

/**
 * Check if procedures require a doctor based on name and database flag
 */
export const checkProceduresRequireDoctor = (procedures) => {
  return procedures.some(p => {
    // Procedure officially requires doctor in DB
    const dbRequires = p.requires_doctor === 1;

    // But if it is one of the staff-only procedures, we override it to false
    const isStaffOnly = STAFF_ONLY_KEYWORDS.some(k =>
      p.name && p.name.toLowerCase().includes(k.toLowerCase())
    );

    return dbRequires && !isStaffOnly;
  });
};

/**
 * Check if any procedure is a 3-stage procedure
 */
export const isThreeStageProcedure = (procedures) => {
  return procedures.some(p => isThreeStageProcedureName(p.name));
};

// Re-export shared functions
export {
  calculateThreeStageDoctorBusyBlocks,
  calculateThreeStageDoctorFreeBlock,
  getThreeStageAnchorTime
};

/**
 * Check if a booking can fit in the FREE window of a 3-stage procedure
 * Wrapper with validation and logging
 */
export const canFitInThreeStageFreeWindow = (bookingStart, bookingEnd, threeStageStart, includeConsult = true) => {
  const normalizedBookingStart = normalizeTime(bookingStart);
  const normalizedBookingEnd = normalizeTime(bookingEnd);
  const normalizedThreeStageStart = normalizeTime(threeStageStart);

  if (!normalizedBookingStart || !normalizedBookingEnd || !normalizedThreeStageStart) {
    console.warn('Invalid time format in canFitInThreeStageFreeWindow');
    return false;
  }

  const fits = sharedCanFitInFreeWindow(
    normalizedBookingStart,
    normalizedBookingEnd,
    normalizedThreeStageStart,
    includeConsult
  );

  console.log('🔍 canFitInThreeStageFreeWindow:', {
    bookingStart: normalizedBookingStart,
    bookingEnd: normalizedBookingEnd,
    threeStageStart: normalizedThreeStageStart,
    includeConsult,
    freeBlock: calculateThreeStageDoctorFreeBlock(normalizedThreeStageStart, includeConsult),
    fits
  });

  return fits;
};
