/**
 * Appointment Color Utilities
 * 
 * Hash-based color assignment for appointments by doctor name.
 * Used by AppointmentsCalendar day view and month/week views.
 */
import type { Appointment } from '../types/appointment';

// Color palette for appointments (สีโทนของเว็บ - อ่อนลงเพื่อดูสบายตา)
export const APPOINTMENT_COLORS = [
  '#5ec4c9', // Teal อ่อน (จาก #c5a059)
  '#c4a574', // Gold อ่อน (จาก #e8d8a1)
  '#4d7c8a', // Blue-Teal อ่อน (จาก #002b38)
  '#7dd3d8', // Teal อ่อนมาก
  '#d4b88e', // Gold อ่อนมาก
  '#a67f4a', // Gold เข้มขึ้นนิด
  '#6ba5b3', // Teal-Blue กลาง
  '#b89560', // Gold กลาง
];

/**
 * Get a consistent color for an appointment based on doctor name hash
 */
export function getAppointmentColor(appointment: Appointment): string {
  let hash = 0;
  const doctorName = appointment.doctor;

  for (let i = 0; i < doctorName.length; i++) {
    hash = ((hash << 5) - hash) + doctorName.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  const colorIndex = Math.abs(hash) % APPOINTMENT_COLORS.length;
  return APPOINTMENT_COLORS[colorIndex];
}
