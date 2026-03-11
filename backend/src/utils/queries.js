// ============================================
// Shared SQL Queries
// Centralize common queries to avoid duplication
// ============================================

/**
 * Get booking with all relations (doctor, machine, room, user, prep_room)
 */
export const BOOKING_WITH_RELATIONS = `
  SELECT 
    b.*,
    doc.id as doctor_id_rel, doc.name as doctor_name, doc.role as doctor_specialty,
    m.id as machine_id_rel, m.name as machine_name, m.type as machine_type,
    r.id as room_id_rel, r.name as room_name,
    pr.id as prep_room_id_rel, pr.name as prep_room_name,
    cr.id as consult_room_id_rel, cr.name as consult_room_name,
    u.id as user_id_rel, u.name as user_name, u.email as user_email, u.role as user_role,
    b.patient_hn,
    (
      SELECT json_group_array(
        json_object(
          'id', p.id,
          'name', p.name,
          'duration_minutes', p.duration_minutes,
          'requires_prep_room', p.requires_prep_room,
          'prep_duration_minutes', p.prep_duration_minutes
        )
      )
      FROM booking_procedures bp
      JOIN procedures p ON bp.procedure_id = p.id
      WHERE bp.booking_id = b.id
    ) as procedures_json
  FROM bookings b
  LEFT JOIN users doc ON b.doctor_id = doc.id AND doc.role IN ('DOCTOR', 'TR')
  LEFT JOIN machines m ON b.machine_id = m.id
  LEFT JOIN rooms r ON b.room_id = r.id
  LEFT JOIN rooms pr ON b.prep_room_id = pr.id
  LEFT JOIN rooms cr ON b.consult_room_id = cr.id
  LEFT JOIN users u ON b.user_id = u.id
`;

/**
 * Get bookings for availability check (includes prep room)
 */
export const BOOKINGS_FOR_AVAILABILITY = `
  SELECT b.*, 
    r.name as room_name, 
    pr.name as prep_room_name,
    m.name as machine_name, 
    d.name as doctor_name 
  FROM bookings b
  LEFT JOIN rooms r ON b.room_id = r.id
  LEFT JOIN rooms pr ON b.prep_room_id = pr.id
  LEFT JOIN rooms cr ON b.consult_room_id = cr.id
  LEFT JOIN machines m ON b.machine_id = m.id
  LEFT JOIN users d ON b.doctor_id = d.id
  WHERE b.date = ? AND b.status != 'CANCELLED'
  ORDER BY b.start_time ASC
`;

/**
 * Transform booking row to nested format
 */
export const transformBookingRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    doctor_id: row.doctor_id,
    machine_id: row.machine_id,
    room_id: row.room_id,
    prep_room_id: row.prep_room_id,
    prep_start_time: row.prep_start_time,
    prep_end_time: row.prep_end_time,
    consult_room_id: row.consult_room_id,
    consult_start_time: row.consult_start_time,
    consult_end_time: row.consult_end_time,
    user_id: row.user_id,
    patient_name: row.patient_name,
    patient_hn: row.patient_hn,
    date: row.date,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    booking_type: row.booking_type,
    doctors: row.doctor_name ? {
      id: row.doctor_id,
      name: row.doctor_name,
      specialty: row.doctor_specialty
    } : null,
    machines: row.machine_name ? {
      id: row.machine_id,
      name: row.machine_name,
      type: row.machine_type
    } : null,
    rooms: row.room_name ? {
      id: row.room_id,
      name: row.room_name
    } : null,
    prep_rooms: row.prep_room_name ? {
      id: row.prep_room_id,
      name: row.prep_room_name
    } : null,
    consult_rooms: row.consult_room_name ? {
      id: row.consult_room_id,
      name: row.consult_room_name
    } : null,
    procedures: row.procedures_json ? JSON.parse(row.procedures_json) : [],
    users: row.user_name ? {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      role: row.user_role
    } : null
  };
};
