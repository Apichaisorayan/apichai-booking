// ============================================
// Data Transformers
// Transform API data (snake_case) to UI data (camelCase)
// ============================================

import { Doctor, Machine, Room, MachineType } from '../types/booking';
import { ApiDoctor, ApiMachine, ApiRoom } from '../types/api';

/**
 * Transform API Doctor to UI Doctor
 */
export const transformDoctor = (apiDoctor: ApiDoctor): Doctor => {
  return {
    id: apiDoctor.id,
    name: apiDoctor.name,
    specialty: apiDoctor.specialty,
    isAvailable: apiDoctor.is_available === 1 || apiDoctor.is_available === true,
  };
};

/**
 * Transform API Machine to UI Machine
 */
export const transformMachine = (apiMachine: ApiMachine): Machine => {
  return {
    id: apiMachine.id,
    name: apiMachine.name,
    type: apiMachine.type as MachineType,
    isAvailable: apiMachine.is_available === 1 || apiMachine.is_available === true,
    roomId: apiMachine.room_id || undefined,
    roomIds: apiMachine.room_ids
      ? apiMachine.room_ids.split(',').map(id => id.trim()).filter(id => id !== '')
      : (apiMachine.room_id ? [apiMachine.room_id] : []),
  };
};

/**
 * Transform API Room to UI Room
 */
export const transformRoom = (apiRoom: ApiRoom): Room => {
  return {
    id: apiRoom.id,
    name: apiRoom.name,
    isAvailable: apiRoom.is_available === 1 || apiRoom.is_available === true,
    room_type: apiRoom.room_type as 'PREP' | 'TREATMENT' | undefined,
  };
};

/**
 * Transform array of API data
 */
export const transformDoctors = (apiDoctors: ApiDoctor[]): Doctor[] => {
  return apiDoctors.map(transformDoctor);
};

export const transformMachines = (apiMachines: ApiMachine[]): Machine[] => {
  return apiMachines.map(transformMachine);
};

export const transformRooms = (apiRooms: ApiRoom[]): Room[] => {
  return apiRooms.map(transformRoom);
};

/**
 * Format time from HH:MM:SS to HH:MM
 */
export const formatTime = (time: string): string => {
  if (!time) return '';
  return time.substring(0, 5); // Get HH:MM from HH:MM:SS
};

/**
 * Format date to Thai format
 */
export const formatDateThai = (date: string): string => {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear() + 543; // Buddhist year
  return `${day}/${month}/${year}`;
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};
