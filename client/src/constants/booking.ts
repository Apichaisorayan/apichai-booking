/**
 * Booking System Constants
 * 
 * Re-exports from sharedBookingRules for backward compatibility.
 * New code should import directly from constants/sharedBookingRules.
 */

// Re-export shared constants (canonical source: sharedBookingRules.ts)
export { STAFF_ONLY_KEYWORDS, SINGLE_ROOM_MACHINES } from './sharedBookingRules';
export { THREE_STAGE_PROCEDURE_KEYWORDS as THREE_STAGE_PROCEDURES } from './sharedBookingRules';

export const BOOKING_STATUS = {
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
    COMPLETED: 'COMPLETED'
} as const;

export const ROOM_TYPES = {
    PREP: 'PREP',
    TREATMENT: 'TREATMENT',
    CONSULTATION: 'CONSULTATION',
    PROCEDURE: 'PROCEDURE',
    MEETING: 'MEETING',
    BOTH: 'BOTH'
} as const;
