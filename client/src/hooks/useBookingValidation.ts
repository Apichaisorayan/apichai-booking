/**
 * ============================================
 * useBookingValidation Hook
 * ============================================
 * 
 * Custom hook for booking validation
 * Handles validation logic and API calls
 * 
 * @module useBookingValidation
 */

import { useState, useEffect } from 'react';
import { bookingsApi } from '../lib/api';
import { toTimeWithSeconds } from '../utils/timeFormat';
import type { BookingFormState } from './useBookingForm';

export interface ValidationResult {
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface UseBookingValidationReturn {
  validationResult: ValidationResult | null;
  isValidating: boolean;
  validate: () => Promise<ValidationResult>;
  clearValidation: () => void;
}

/**
 * Custom hook for booking validation
 * Auto-validates when required fields change
 */
export const useBookingValidation = (
  formState: BookingFormState,
  editingBookingId: string | null = null
) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Validate booking
   */
  const validate = async (): Promise<ValidationResult> => {
    const {
      selectedDoctor,
      selectedMachine,
      selectedRoom,
      selectedPrepRoom,
      selectedConsultRoom,
      selectedDate,
      startTime,
      endTime,
      prepStartTime,
      prepEndTime,
      requiresPrepRoom,
      isThreeStage,
      threeStageTimes,
      isDoctorOptional,
      selectedProcedureIds,
    } = formState;

    // Check required fields
    if (!selectedMachine || !selectedRoom) {
      const result = {
        success: false,
        message: 'กรุณาเลือกข้อมูลให้ครบถ้วน',
        errors: ['กรุณาเลือกเครื่องและห้อง'],
      };
      setValidationResult(result);
      return result;
    }

    if (!isDoctorOptional && !selectedDoctor) {
      const result = {
        success: false,
        message: 'กรุณาเลือกแพทย์',
        errors: ['หัตถการนี้ต้องการแพทย์'],
      };
      setValidationResult(result);
      return result;
    }

    // Check if 3-stage needs consult room
    if (isThreeStage && !selectedConsultRoom) {
      const result = {
        success: false,
        message: 'กรุณาเลือกห้องปรึกษา',
        errors: ['หัตถการ 3 ขั้นตอนต้องการห้องปรึกษา'],
      };
      setValidationResult(result);
      return result;
    }

    // Check if prep room is needed
    // if (requiresPrepRoom && !selectedPrepRoom) {
    //   const result = {
    //     success: false,
    //     message: 'กรุณาเลือกห้องเตรียมตัว',
    //     errors: ['หัตถการนี้ต้องการห้องเตรียมตัว'],
    //   };
    //   setValidationResult(result);
    //   return result;
    // }

    try {
      setIsValidating(true);

      const validationData: any = {
        doctor_id: isDoctorOptional ? null : (selectedDoctor?.id || null),
        machine_id: selectedMachine.id,
        room_id: selectedRoom.id,
        date: selectedDate,
        start_time: toTimeWithSeconds(requiresPrepRoom ? prepEndTime : startTime),
        end_time: toTimeWithSeconds(endTime),
        procedure_ids: selectedProcedureIds,
      };

      // Add exclude_booking_id when editing
      if (editingBookingId) {
        validationData.exclude_booking_id = editingBookingId;
      }

      // Add 3-stage data if needed
      if (isThreeStage && threeStageTimes) {
        validationData.consult_room_id = selectedConsultRoom?.id;
        validationData.consult_start_time = toTimeWithSeconds(threeStageTimes.consultStartTime);
        validationData.consult_end_time = toTimeWithSeconds(threeStageTimes.consultEndTime);
        validationData.prep_start_time = toTimeWithSeconds(threeStageTimes.prepStartTime);
        validationData.prep_end_time = toTimeWithSeconds(threeStageTimes.prepEndTime);
      }

      // Add prep stage data if needed (standard 2-stage)
      if (!isThreeStage && requiresPrepRoom && selectedPrepRoom && prepStartTime && prepEndTime) {
        validationData.prep_room_id = selectedPrepRoom.id;
        validationData.prep_start_time = toTimeWithSeconds(prepStartTime);
        validationData.prep_end_time = toTimeWithSeconds(prepEndTime);
      }

      const result = await bookingsApi.validate(validationData) as ValidationResult;
      setValidationResult(result);
      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'เกิดข้อผิดพลาดในการตรวจสอบ';
      const result = {
        success: false,
        message: errorMsg,
        errors: [errorMsg],
      };
      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Clear validation result
   */
  const clearValidation = () => {
    setValidationResult(null);
  };

  // Auto-validate when key fields change
  useEffect(() => {
    const {
      selectedDoctor,
      selectedMachine,
      selectedRoom,
      selectedPrepRoom,
      selectedConsultRoom,
      selectedDate,
      startTime,
      endTime,
      prepStartTime,
      prepEndTime,
      requiresPrepRoom,
      isThreeStage,
      isDoctorOptional,
      selectedProcedureIds,
    } = formState;

    // Clear validation when fields change
    clearValidation();

    // Auto-validate if all required fields are filled
    if (
      (selectedDoctor || isDoctorOptional) &&
      selectedMachine &&
      selectedRoom &&
      selectedDate &&
      startTime &&
      endTime &&
      (!isThreeStage || selectedConsultRoom) &&
      (!requiresPrepRoom || selectedPrepRoom)
    ) {
      validate();
    }
  }, [
    formState.selectedDoctor,
    formState.selectedMachine,
    formState.selectedRoom,
    formState.selectedPrepRoom,
    formState.selectedConsultRoom,
    formState.selectedDate,
    formState.startTime,
    formState.endTime,
    formState.prepStartTime,
    formState.prepEndTime,
    formState.selectedProcedureIds,
  ]);

  return {
    validationResult,
    isValidating,
    validate,
    clearValidation,
  };
};
