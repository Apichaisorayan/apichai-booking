/**
 * Appointment type used across calendar views
 * 
 * Extracted from DoctorTimelineView.tsx to be shared by:
 * - AppointmentsCalendar.tsx
 * - DoctorTimelineView.tsx
 * - bookingTransformer.ts
 */

export interface Appointment {
    id: string;
    title: string;
    patient: string;
    patient_hn?: string;
    doctor: string;
    doctorId?: string;
    treatment: string;
    room: string;
    roomId?: string;
    prepRoom?: string;
    prepRoomId?: string;
    machine: string;
    machineId?: string;
    procedure?: string;
    procedures?: Array<{ id: number; name: string; duration_minutes: number; requires_prep_room?: number; prep_duration_minutes?: number }>;
    procedureId?: string;
    consultRoom?: string;
    consultRoomId?: string;
    consultStartTime?: string;
    consultEndTime?: string;
    date: Date;
    startTime: string;
    endTime: string;
    prepStartTime?: string;
    prepEndTime?: string;
    color: string;
    status: string;
    notes?: string;
    createdBy?: string;
    createdByRole?: string;
    isConsultOnly?: boolean;
    treatmentStartTime?: string;
}
