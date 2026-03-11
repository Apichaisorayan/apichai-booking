/**
 * ============================================
 * useBookingForm Hook
 * ============================================
 * 
 * Custom hook for managing booking form state and logic
 * Separates business logic from UI components
 * 
 * @module useBookingForm
 */

import { useState, useEffect } from 'react';
import type { Doctor, Machine, Room, Procedure } from '../types/booking';
import { 
  checkRequiresPrepRoom, 
  getMaxPrepDuration, 
  calculatePrepTimes 
} from '../utils/prepStageHelper';
import { 
  checkIfDoctorIsOptional, 
  isThreeStageProcedure, 
  calculateThreeStageTimes 
} from '../utils/bookingLogic';

export interface BookingFormState {
  // Resources
  selectedDoctor: Doctor | null;
  selectedMachine: Machine | null;
  selectedRoom: Room | null;
  selectedPrepRoom: Room | null;
  selectedConsultRoom: Room | null;
  
  // Procedures
  selectedProcedureIds: string[];
  procedures: Procedure[];
  
  // Time
  selectedDate: string;
  startTime: string;
  endTime: string;
  prepStartTime: string;
  prepEndTime: string;
  
  // Patient
  patientName: string;
  notes: string;
  
  // Flags
  requiresPrepRoom: boolean;
  isThreeStage: boolean;
  isDoctorOptional: boolean;
  
  // 3-stage times
  threeStageTimes: any | null;
}

export interface BookingFormActions {
  setSelectedDoctor: (doctor: Doctor | null) => void;
  setSelectedMachine: (machine: Machine | null) => void;
  setSelectedRoom: (room: Room | null) => void;
  setSelectedPrepRoom: (room: Room | null) => void;
  setSelectedConsultRoom: (room: Room | null) => void;
  setSelectedProcedureIds: (ids: string[]) => void;
  setProcedures: (procedures: Procedure[]) => void;
  setSelectedDate: (date: string) => void;
  setStartTime: (time: string) => void;
  setEndTime: (time: string) => void;
  setPatientName: (name: string) => void;
  setNotes: (notes: string) => void;
  resetForm: () => void;
}

const initialState: BookingFormState = {
  selectedDoctor: null,
  selectedMachine: null,
  selectedRoom: null,
  selectedPrepRoom: null,
  selectedConsultRoom: null,
  selectedProcedureIds: [],
  procedures: [],
  selectedDate: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '10:00',
  prepStartTime: '',
  prepEndTime: '',
  patientName: '',
  notes: '',
  requiresPrepRoom: false,
  isThreeStage: false,
  isDoctorOptional: false,
  threeStageTimes: null,
};

/**
 * Custom hook for managing booking form state
 * Handles all business logic for booking creation/editing
 */
export const useBookingForm = () => {
  const [state, setState] = useState<BookingFormState>(initialState);

  // Calculate derived state when procedures or machine changes
  useEffect(() => {
    if (state.selectedProcedureIds.length === 0 || state.procedures.length === 0) {
      setState(prev => ({
        ...prev,
        requiresPrepRoom: false,
        isThreeStage: false,
        isDoctorOptional: false,
        prepStartTime: '',
        prepEndTime: '',
        threeStageTimes: null,
      }));
      return;
    }

    const selectedProcedures = state.procedures.filter(p => 
      state.selectedProcedureIds.includes(p.id)
    );

    // Check if doctor is optional
    const doctorOptional = checkIfDoctorIsOptional(
      state.selectedMachine,
      selectedProcedures
    );

    // Check if 3-stage procedure
    const threeStage = isThreeStageProcedure(selectedProcedures);

    if (threeStage) {
      // Calculate 3-stage times
      const times = calculateThreeStageTimes(state.startTime);
      setState(prev => ({
        ...prev,
        isThreeStage: true,
        isDoctorOptional: doctorOptional,
        threeStageTimes: times,
        endTime: times.treatmentEndTime,
        requiresPrepRoom: false, // Handled by 3-stage logic
      }));
    } else {
      // Check if prep room is needed
      const needsPrep = checkRequiresPrepRoom(
        selectedProcedures,
        state.selectedMachine?.name
      );

      if (needsPrep) {
        const maxPrepDuration = getMaxPrepDuration(selectedProcedures);
        const { prepStartTime, prepEndTime } = calculatePrepTimes(
          state.startTime,
          maxPrepDuration
        );

        // Calculate treatment end time
        const treatmentDuration = Math.max(
          ...selectedProcedures.map(p => p.duration_minutes || 0)
        );
        const [prepEndHours, prepEndMinutes] = prepEndTime.split(':').map(Number);
        const treatmentEndMinutes = prepEndHours * 60 + prepEndMinutes + treatmentDuration;
        const treatmentEndHours = Math.floor(treatmentEndMinutes / 60);
        const treatmentEndMins = treatmentEndMinutes % 60;
        const calculatedEndTime = `${treatmentEndHours.toString().padStart(2, '0')}:${treatmentEndMins.toString().padStart(2, '0')}`;

        setState(prev => ({
          ...prev,
          requiresPrepRoom: true,
          isThreeStage: false,
          isDoctorOptional: doctorOptional,
          prepStartTime,
          prepEndTime,
          endTime: calculatedEndTime,
          threeStageTimes: null,
        }));
      } else {
        // No prep needed, calculate end time from start time
        const treatmentDuration = Math.max(
          ...selectedProcedures.map(p => p.duration_minutes || 0)
        );
        const [hours, minutes] = state.startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + treatmentDuration;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        const calculatedEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

        setState(prev => ({
          ...prev,
          requiresPrepRoom: false,
          isThreeStage: false,
          isDoctorOptional: doctorOptional,
          prepStartTime: '',
          prepEndTime: '',
          endTime: calculatedEndTime,
          selectedPrepRoom: null,
          threeStageTimes: null,
        }));
      }
    }
  }, [state.selectedProcedureIds, state.startTime, state.procedures, state.selectedMachine]);

  // Actions
  const actions: BookingFormActions = {
    setSelectedDoctor: (doctor) => setState(prev => ({ ...prev, selectedDoctor: doctor })),
    setSelectedMachine: (machine) => setState(prev => ({ ...prev, selectedMachine: machine })),
    setSelectedRoom: (room) => setState(prev => ({ ...prev, selectedRoom: room })),
    setSelectedPrepRoom: (room) => setState(prev => ({ ...prev, selectedPrepRoom: room })),
    setSelectedConsultRoom: (room) => setState(prev => ({ ...prev, selectedConsultRoom: room })),
    setSelectedProcedureIds: (ids) => setState(prev => ({ ...prev, selectedProcedureIds: ids })),
    setProcedures: (procedures) => setState(prev => ({ ...prev, procedures })),
    setSelectedDate: (date) => setState(prev => ({ ...prev, selectedDate: date })),
    setStartTime: (time) => setState(prev => ({ ...prev, startTime: time })),
    setEndTime: (time) => setState(prev => ({ ...prev, endTime: time })),
    setPatientName: (name) => setState(prev => ({ ...prev, patientName: name })),
    setNotes: (notes) => setState(prev => ({ ...prev, notes })),
    resetForm: () => setState(initialState),
  };

  return { state, actions };
};
