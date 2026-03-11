/**
 * ============================================
 * useBookingResources Hook
 * ============================================
 * 
 * Custom hook for fetching and managing booking resources
 * (doctors, machines, rooms, procedures)
 * 
 * @module useBookingResources
 */

import { useState, useEffect } from 'react';
import { usersApi, machinesApi, roomsApi } from '../lib/api';
import { transformMachines, transformRooms } from '../utils/dataTransformers';
import type { Doctor, Machine, Room } from '../types/booking';
import type { ApiMachine, ApiRoom } from '../types/api';

export interface BookingResources {
  doctors: Doctor[];
  machines: Machine[];
  rooms: Room[];
  prepRooms: Room[];
  treatmentRooms: Room[];
  consultRooms: Room[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for fetching booking resources
 * Handles loading state and error handling
 */
export const useBookingResources = () => {
  const [resources, setResources] = useState<BookingResources>({
    doctors: [],
    machines: [],
    rooms: [],
    prepRooms: [],
    treatmentRooms: [],
    consultRooms: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setResources(prev => ({ ...prev, isLoading: true, error: null }));

        const [usersData, machinesData, roomsData] = await Promise.all([
          usersApi.getAll(),
          machinesApi.getAll({ category: 'MEDICAL' }),
          roomsApi.getAll({ type: 'PROCEDURE' }),
        ]);

        // Transform doctors
        const doctorUsers = (usersData as any[]).filter(user => user.role === 'DOCTOR');
        const transformedDoctors: Doctor[] = doctorUsers.map(user => ({
          id: user.id,
          name: user.name,
          specialty: 'แพทย์',
          isAvailable: true,
        }));

        // Transform machines and rooms
        const transformedMachines = transformMachines(machinesData as ApiMachine[]);
        const transformedRooms = transformRooms(roomsData as ApiRoom[]);

        // Separate rooms by type
        const prepRoomsList = transformedRooms.filter(r => 
          r.room_type === 'PREP' || r.room_type === 'BOTH'
        );
        const treatmentRoomsList = transformedRooms.filter(r => 
          r.room_type === 'TREATMENT' || r.room_type === 'BOTH'
        );
        const consultRoomsList = transformedRooms.filter(r => 
          r.room_type === 'CONSULTATION' || r.room_type === 'BOTH'
        );

        setResources({
          doctors: transformedDoctors,
          machines: transformedMachines,
          rooms: transformedRooms,
          prepRooms: prepRoomsList,
          treatmentRooms: treatmentRoomsList,
          consultRooms: consultRoomsList,
          isLoading: false,
          error: null,
        });
      } catch (error: any) {
        setResources(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'ไม่สามารถโหลดข้อมูลได้',
        }));
      }
    };

    fetchResources();
  }, []);

  return resources;
};
