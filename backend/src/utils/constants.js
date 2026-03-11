// ============================================
// Application Constants
// Centralize all magic numbers and config values
// ============================================

// Business Hours
export const BUSINESS_HOURS = {
  START: '09:00',
  END: '20:00',
  START_HOUR: 9,
  END_HOUR: 20
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  SALES: 'SALES',
  CRM: 'CRM',
  TR: 'TR'
};

export const VALID_ROLES = Object.values(USER_ROLES);

// Room Types
export const ROOM_TYPES = {
  PROCEDURE: 'PROCEDURE',
  MEETING: 'MEETING',
  BOTH: 'BOTH'
};

export const VALID_ROOM_TYPES = Object.values(ROOM_TYPES);

// Booking Types
export const BOOKING_TYPES = {
  PROCEDURE: 'PROCEDURE',
  MEETING: 'MEETING',
  CONSULTATION: 'CONSULTATION'
};

export const VALID_BOOKING_TYPES = Object.values(BOOKING_TYPES);

// Validation Messages
export const VALIDATION_MESSAGES = {
  MISSING_FIELDS: 'Missing required fields',
  INVALID_ROLE: 'Invalid role',
  INVALID_TYPE: 'Invalid type',
  INVALID_STATUS: 'Invalid status',
  EMAIL_EXISTS: 'Email already exists',
  NOT_FOUND: 'Resource not found',
  FIXED_MACHINE_NEEDS_ROOM: 'FIXED machines must have room_id'
};
