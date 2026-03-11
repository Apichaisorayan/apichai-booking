/**
 * ============================================
 * Shared Booking Rules & Constants
 * ============================================
 * 
 * Centralized constants that are shared between client and server
 * These values should match client/src/constants/sharedBookingRules.ts
 * 
 * @module sharedBookingRules
 */

// Procedure keywords
export const THREE_STAGE_PROCEDURE_KEYWORDS = ['miraDry'];
export const CONSULT_PROCEDURE_KEYWORDS = ['ปรึกษา', 'Consult', 'Consultation'];
export const STAFF_ONLY_KEYWORDS = ['Plasmalis', 'Tesla', 'D-Cool', 'Diode'];
export const SINGLE_ROOM_MACHINES = ['Tesla', 'Skinpen', 'Diode', 'D-Cool', 'miraDry'];

// Special procedures that only use prep room (no treatment room)
export const PREP_ROOM_ONLY_PROCEDURES = ['Tesla Former'];

// Procedures that should NOT show consult room
export const NO_CONSULT_ROOM_PROCEDURES = ['Tesla', 'Plasmalis', 'D-Cool', 'F/U miraDry', 'Diode'];


// Time durations (in minutes)
export const MIRADRY_DURATIONS = {
  CONSULT: 30,    // Stage 1: Consultation (Doctor BUSY)
  PREP: 30,       // Stage 2: Preparation (Doctor FREE ✅)
  TREATMENT: 120, // Stage 3: Treatment (Room is BUSY)
  TREATMENT_DOCTOR: 30, // Stage 3: Doctor BUSY part (First 30m only)
};

export const DEFAULT_PREP_DURATION = 30;

// Business hours
export const BUSINESS_HOURS = {
  START: '08:00',
  END: '20:00',
};

// Validation rules
export const VALIDATION_RULES = {
  MIN_BOOKING_DURATION: 15,  // minutes
  MAX_BOOKING_DURATION: 480, // 8 hours
};

/**
 * Check if procedure name matches 3-stage keywords (miraDry only)
 * @param {string} procedureName - Procedure name to check
 * @returns {boolean}
 */
export const isThreeStageProcedureName = (procedureName) => {
  if (procedureName.toLowerCase().includes('f/u')) return false;
  return THREE_STAGE_PROCEDURE_KEYWORDS.some(keyword =>
    procedureName.toLowerCase().includes(keyword.toLowerCase())
  );
};

/**
 * Check if procedure name is a consultation procedure (addon consult room)
 * @param {string} procedureName - Procedure name to check
 * @returns {boolean}
 */
export const isConsultProcedureName = (procedureName) => {
  return CONSULT_PROCEDURE_KEYWORDS.some(keyword =>
    procedureName.toLowerCase().includes(keyword.toLowerCase())
  );
};

/**
 * Check if procedure name matches staff-only keywords
 * @param {string} procedureName - Procedure name to check
 * @returns {boolean}
 */
export const isStaffOnlyProcedureName = (procedureName) => {
  return STAFF_ONLY_KEYWORDS.some(keyword =>
    procedureName.toLowerCase().includes(keyword.toLowerCase())
  );
};

/**
 * Check if machine name is single-room machine
 * @param {string} machineName - Machine name to check
 * @returns {boolean}
 */
export const isSingleRoomMachineName = (machineName) => {
  return SINGLE_ROOM_MACHINES.some(machine =>
    machineName.toLowerCase().includes(machine.toLowerCase())
  );
};

/**
 * Check if procedure uses prep room only (no treatment room)
 * @param {string} procedureName - Procedure name to check
 * @returns {boolean}
 */
export const isPrepRoomOnlyProcedure = (procedureName) => {
  return PREP_ROOM_ONLY_PROCEDURES.some(keyword =>
    procedureName.toLowerCase().includes(keyword.toLowerCase())
  );
};

/**
 * Check if procedure should NOT show consult room
 * @param {string} procedureName - Procedure name to check
 * @returns {boolean}
 */
export const shouldHideConsultRoom = (procedureName) => {
  // Allow all procedures to have consultation option
  return false;
};
