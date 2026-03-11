// ============================================
// Shared Availability Calculator
// ใช้ร่วมกันระหว่าง users, machines, rooms
// ============================================

/**
 * Calculate availability for a resource based on bookings
 * @param {Array} bookings - Array of bookings for the resource
 * @param {string} date - Date to check (YYYY-MM-DD)
 * @returns {Object} Availability info
 */
export const calculateAvailability = (bookings, date) => {
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' +
    now.getMinutes().toString().padStart(2, '0');
  const currentDate = now.toISOString().split('T')[0];

  let isAvailable = true;
  let currentTask = null;
  let nextAvailable = null;

  // Only check current status if the requested date is today
  if (date === currentDate) {
    // Check if currently in a booking
    for (const booking of bookings) {
      if (booking.start_time <= currentTime && booking.end_time > currentTime) {
        isAvailable = false;
        currentTask = {
          start: booking.start_time,
          end: booking.end_time,
          room: booking.room_name,
          service: booking.notes || 'Treatment',
          doctor: booking.doctor_name,
          machine: booking.machine_name
        };
        break;
      }
    }

    // Find next available time slot
    if (bookings.length > 0) {
      nextAvailable = findNextAvailableSlot(bookings, currentTime);
    }
  }

  return {
    is_available: isAvailable,
    current_task: currentTask,
    next_available: nextAvailable,
    schedule: bookings.map(b => ({
      start: b.start_time,
      end: b.end_time,
      room: b.room_name,
      service: b.notes || 'Treatment',
      doctor: b.doctor_name,
      machine: b.machine_name
    }))
  };
};

/**
 * Find next available time slot
 * @param {Array} bookings - Sorted bookings
 * @param {string} currentTime - Current time (HH:MM)
 * @returns {string|null} Next available time
 */
const findNextAvailableSlot = (bookings, currentTime) => {
  const sortedBookings = [...bookings].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  // Check if current time is in a gap (available now)
  let isInGap = true;
  for (const booking of sortedBookings) {
    if (booking.start_time <= currentTime && booking.end_time > currentTime) {
      isInGap = false;
      break;
    }
  }

  if (isInGap) {
    let gapStart = '00:00';
    for (const booking of sortedBookings) {
      if (booking.end_time <= currentTime) {
        gapStart = booking.end_time;
      } else if (booking.start_time > currentTime) {
        break;
      }
    }
    return gapStart > currentTime ? gapStart : currentTime;
  }

  // Not in a gap, find next available slot
  let lastEndTime = currentTime;

  for (const booking of sortedBookings) {
    if (booking.end_time <= currentTime) {
      continue;
    }

    if (booking.start_time > currentTime) {
      if (lastEndTime < booking.start_time) {
        return lastEndTime;
      }
      lastEndTime = booking.end_time;
    } else if (booking.end_time > currentTime) {
      lastEndTime = booking.end_time;
    }
  }

  // No gap found, next available is after the last booking
  const lastBooking = sortedBookings[sortedBookings.length - 1];
  if (lastBooking.end_time > currentTime) {
    return lastBooking.end_time;
  }

  return null;
};

/**
 * Check if time ranges overlap
 * @param {string} start1 - Start time 1 (HH:MM)
 * @param {string} end1 - End time 1 (HH:MM)
 * @param {string} start2 - Start time 2 (HH:MM)
 * @param {string} end2 - End time 2 (HH:MM)
 * @returns {boolean} True if overlaps
 */
export const timeRangesOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};


