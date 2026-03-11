/**
 * UI Utilities
 * Helper functions สำหรับ UI components
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind classes with proper precedence
 * ใช้สำหรับรวม className ที่อาจซ้ำกัน
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
