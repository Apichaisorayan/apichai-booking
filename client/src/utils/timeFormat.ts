/**
 * ============================================
 * Time Format Utilities
 * ============================================
 * 
 * Centralized time formatting utilities
 * Standard format: HH:MM (24-hour format)
 * 
 * @module timeFormat
 */

/**
 * Normalize time to HH:MM format
 * Handles both HH:MM and HH:MM:SS inputs
 * 
 * @param time - Time string in HH:MM or HH:MM:SS format
 * @returns Time in HH:MM format or null if invalid
 * 
 * @example
 * normalizeTime('13:30') => '13:30'
 * normalizeTime('13:30:00') => '13:30'
 * normalizeTime('invalid') => null
 */
export const normalizeTime = (time: string | null | undefined): string | null => {
  if (!time) return null;
  
  // Extract HH:MM from HH:MM or HH:MM:SS
  const normalized = time.substring(0, 5);
  
  // Validate HH:MM format
  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    console.warn(`Invalid time format: ${time}`);
    return null;
  }
  
  return normalized;
};

/**
 * Convert HH:MM to HH:MM:SS format (for database storage)
 * 
 * @param time - Time in HH:MM format
 * @returns Time in HH:MM:SS format or null if invalid
 */
export const toTimeWithSeconds = (time: string | null | undefined): string | null => {
  const normalized = normalizeTime(time);
  if (!normalized) return null;
  
  return `${normalized}:00`;
};

/**
 * Validate time format
 * 
 * @param time - Time string to validate
 * @returns True if valid HH:MM format
 */
export const isValidTimeFormat = (time: string): boolean => {
  return /^\d{2}:\d{2}$/.test(time);
};

/**
 * Compare two times
 * 
 * @param time1 - First time (HH:MM or HH:MM:SS)
 * @param time2 - Second time (HH:MM or HH:MM:SS)
 * @returns -1 if time1 < time2, 0 if equal, 1 if time1 > time2
 */
export const compareTime = (time1: string, time2: string): number => {
  const t1 = normalizeTime(time1);
  const t2 = normalizeTime(time2);
  
  if (!t1 || !t2) return 0;
  
  if (t1 < t2) return -1;
  if (t1 > t2) return 1;
  return 0;
};

/**
 * Check if time is within range
 * 
 * @param time - Time to check
 * @param start - Range start time
 * @param end - Range end time
 * @returns True if time is within range [start, end)
 */
export const isTimeInRange = (time: string, start: string, end: string): boolean => {
  const t = normalizeTime(time);
  const s = normalizeTime(start);
  const e = normalizeTime(end);
  
  if (!t || !s || !e) return false;
  
  return t >= s && t < e;
};
