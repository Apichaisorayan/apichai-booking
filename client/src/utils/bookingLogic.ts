
import {
  STAFF_ONLY_KEYWORDS,
  SINGLE_ROOM_MACHINES,
  isThreeStageProcedureName,
  isStaffOnlyProcedureName,
  isSingleRoomMachineName
} from '../constants/sharedBookingRules';
import {
  calculateThreeStageTimes as sharedCalculateThreeStageTimes,
  calculateThreeStageDoctorFreeBlock,
  canFitInThreeStageFreeWindow as sharedCanFitInFreeWindow
} from './sharedTimeCalculations';
import { Procedure, Machine } from '../types/booking';

// Re-export for backward compatibility
export { STAFF_ONLY_KEYWORDS, SINGLE_ROOM_MACHINES };

/**
 * Check if a booking requires a doctor based on the machine or procedures
 */
export const checkIfDoctorIsOptional = (
  selectedMachine: Machine | null,
  selectedProcedures: Procedure[]
): boolean => {
  // 1. Check machine name
  if (selectedMachine && isStaffOnlyProcedureName(selectedMachine.name)) {
    return true;
  }

  // 2. Check selected procedures
  if (selectedProcedures.length > 0) {
    // If ANY selected procedure is NOT in staff-only list, a doctor is required
    const hasDoctorRequiredProcedure = selectedProcedures.some(p => {
      return !isStaffOnlyProcedureName(p.name);
    });
    return !hasDoctorRequiredProcedure;
  }

  return false;
};

/**
 * Check if a machine should auto-select its fixed room
 */
export const getFixedRoomId = (machine: Machine | null): string | null => {
  if (machine && machine.type === 'FIXED' && machine.roomId) {
    return machine.roomId;
  }
  return null;
};

/**
 * Check if a machine is a single-room machine (no separate prep room needed)
 */
export const isSingleRoomMachine = (machineName?: string): boolean => {
  if (!machineName) return false;
  return isSingleRoomMachineName(machineName);
};

/**
 * Check if any selected procedure is a 3-stage procedure (like miraDry)
 */
export const isThreeStageProcedure = (procedures: Procedure[]): boolean => {
  return procedures.some(p => isThreeStageProcedureName(p.name));
};

/**
 * Calculate times for 3-stage procedures
 * Wrapper that uses shared calculation
 */
export const calculateThreeStageTimes = (startTime: string, treatmentDuration?: number, includeConsult?: boolean) => {
  return sharedCalculateThreeStageTimes(startTime, treatmentDuration, includeConsult);
};

/**
 * Check if a booking can fit in the FREE window of a 3-stage procedure
 * Re-export from shared calculations
 */
export const canFitInThreeStageFreeWindow = sharedCanFitInFreeWindow;

// Re-export other shared functions
export { calculateThreeStageDoctorFreeBlock };
