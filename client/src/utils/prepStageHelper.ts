/**
 * Helper functions for prep stage bookings
 */

import type { Procedure } from '../types/booking';

import { isSingleRoomMachineName } from '../constants/sharedBookingRules';

/**
 * Check if selected procedures require prep room
 * Special case: Tesla and other machines that use a single room don't need separate prep room
 */
export const checkRequiresPrepRoom = (procedures: Procedure[], machineName?: string): boolean => {
  // Special case: machines that use a single room for both prep and treatment
  if (machineName && isSingleRoomMachineName(machineName)) {
    return false; // These machines don't need separate prep room
  }

  return procedures.some(p => !!p.requires_prep_room);
};

/**
 * Get maximum prep duration from selected procedures
 */
export const getMaxPrepDuration = (procedures: Procedure[]): number => {
  const prepProcedures = procedures.filter(p => p.requires_prep_room);
  if (prepProcedures.length === 0) return 0;

  return Math.max(...prepProcedures.map(p => p.prep_duration_minutes || 0));
};

/**
 * Calculate prep time range based on booking start time and prep duration
 * Prep starts at the booking time, then treatment follows after prep is done
 */
export const calculatePrepTimes = (
  bookingStartTime: string,
  prepDurationMinutes: number
): { prepStartTime: string; prepEndTime: string } => {
  const [hours, minutes] = bookingStartTime.split(':').map(Number);
  const prepStartMinutes = hours * 60 + minutes;
  const prepEndMinutes = prepStartMinutes + prepDurationMinutes;

  const prepEndHours = Math.floor(prepEndMinutes / 60);
  const prepEndMins = prepEndMinutes % 60;

  return {
    prepStartTime: bookingStartTime, // Prep starts at booking time
    prepEndTime: `${prepEndHours.toString().padStart(2, '0')}:${prepEndMins.toString().padStart(2, '0')}`
  };
};

/**
 * Format time range for display
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`;
};

/**
 * Calculate total booking duration including prep
 */
export const calculateTotalDuration = (
  prepDuration: number,
  treatmentDuration: number
): number => {
  return prepDuration + treatmentDuration;
};
