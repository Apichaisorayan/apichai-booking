import { Hono } from 'hono';
import { executeQuery, executeOne, executeRun } from '../utils/db.js';
import { isStaffOnlyProcedureName } from '../utils/sharedBookingRules.js';

const calendar = new Hono();

// Helper: Get Google Calendar API access token
async function getAccessToken(c) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization token');
  }

  const token = authHeader.substring(7);

  // In production, verify JWT and get user's Google token from DB
  // For now, we'll use the token directly
  return token;
}

// Helper: Call Google Calendar API
async function callGoogleCalendarAPI(endpoint, options = {}) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || `Google Calendar API error: ${response.status}`);
  }

  return response.json();
}

// Get Google OAuth URL
calendar.get('/auth/url', (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID;

  // Check if client ID exists
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID is not set in environment variables');
    return c.json({
      success: false,
      error: 'Google Calendar integration is not configured. Please contact administrator.'
    }, 500);
  }

  // Auto-detect redirect URI based on request origin
  const origin = c.req.header('Origin') || c.req.header('Referer') || '';
  let redirectUri = c.env.GOOGLE_REDIRECT_URI;

  // If no explicit redirect URI set, auto-detect from origin
  if (!redirectUri || origin) {
    if (origin.includes('localhost')) {
      redirectUri = 'http://localhost:5173/auth/callback';
    } else if (origin.includes('qa.beauty-clinic-app.pages.dev')) {
      redirectUri = 'https://qa.beauty-clinic-app.pages.dev/auth/callback';
    } else if (origin.includes('deploy.beauty-clinic-app.pages.dev')) {
      redirectUri = 'https://deploy.beauty-clinic-app.pages.dev/auth/callback';
    } else if (origin.includes('beauty-clinic-app.pages.dev')) {
      // Extract full origin for any other Cloudflare Pages preview
      const url = new URL(origin);
      redirectUri = `${url.origin}/auth/callback`;
    } else if (redirectUri) {
      // Use env variable as fallback
    } else {
      redirectUri = 'http://localhost:5173/auth/callback'; // fallback
    }
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `access_type=offline&` +
    `prompt=consent`;

  return c.json({ url: authUrl, redirect_uri: redirectUri });
});

// Exchange authorization code for tokens
calendar.post('/auth/callback', async (c) => {
  try {
    const { code, redirect_uri } = await c.req.json();

    // Use provided redirect_uri or auto-detect
    const origin = c.req.header('Origin') || c.req.header('Referer') || '';
    let finalRedirectUri = redirect_uri || c.env.GOOGLE_REDIRECT_URI;

    if (!finalRedirectUri || origin) {
      if (origin.includes('localhost')) {
        finalRedirectUri = 'http://localhost:5173/auth/callback';
      } else if (origin.includes('qa.beauty-clinic-app.pages.dev')) {
        finalRedirectUri = 'https://qa.beauty-clinic-app.pages.dev/auth/callback';
      } else if (origin.includes('deploy.beauty-clinic-app.pages.dev')) {
        finalRedirectUri = 'https://deploy.beauty-clinic-app.pages.dev/auth/callback';
      } else if (origin.includes('beauty-clinic-app.pages.dev')) {
        const url = new URL(origin);
        finalRedirectUri = `${url.origin}/auth/callback`;
      } else if (finalRedirectUri) {
        // Use env variable as fallback
      } else {
        finalRedirectUri = 'http://localhost:5173/auth/callback';
      }
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: finalRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Token exchange error:', errorData);
      throw new Error(errorData.error_description || 'Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();

    // TODO: Store tokens in database associated with user
    // For now, return them to client
    return c.json({
      success: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Helper: Ensure time string is treated as Thailand time
function toThaiISOString(timeStr) {
  if (!timeStr) return null;
  // If already has timezone info (Z or +07:00 etc), trust it
  if (timeStr.includes('Z') || /[\+\-]\d{2}:\d{2}$/.test(timeStr)) {
    return new Date(timeStr).toISOString();
  }

  // Format to standard ISO-like string first (replace space with T)
  let formatted = timeStr.replace(' ', 'T');
  if (!formatted.includes('T') && formatted.includes(':')) {
    // It's just a time? Or Date? Assume full datetime string for this helper
    // If it is just HH:mm:ss we can't do much without date.
  }

  // Append +07:00
  return new Date(`${formatted}+07:00`).toISOString();
}

// Create event in Google Calendar
calendar.post('/events', async (c) => {
  try {
    const googleToken = await getAccessToken(c);
    const { booking_id, title, patient_name, doctor_name, treatment, start_time, end_time, notes, room_name, prep_time, cleanup_time } = await c.req.json();

    // Get procedure name from booking to check if doctor is required
    let requiresDoctor = true;
    if (booking_id) {
      const procedureResult = await executeQuery(
        c.env.DB,
        `SELECT p.name 
         FROM booking_procedures bp
         JOIN procedures p ON bp.procedure_id = p.id
         WHERE bp.booking_id = ?
         LIMIT 1`,
        [booking_id]
      );
      if (procedureResult.length > 0) {
        requiresDoctor = !isStaffOnlyProcedureName(procedureResult[0].name);
      }
    }

    // Check if machine/treatment is staff only (no doctor) - use centralized logic
    if (treatment && isStaffOnlyProcedureName(treatment)) {
      requiresDoctor = false;
    }

    // Parse datetime (Treat as Thailand Time)
    const startDateTime = toThaiISOString(start_time);
    const endDateTime = toThaiISOString(end_time);

    // Assign color based on doctor name (for variety)
    const colorMap = {
      'DR.Leo': '1', // Lavender
      'Dr. Michael Chen': '2', // Sage
      'Dr. Sarah Wong': '3', // Grape
      'Dr. James Kim': '4', // Flamingo
      'Dr. Emily Park': '5', // Banana
      'Dr. David Lee': '6', // Tangerine
      'Dr. Lisa Chen': '7', // Peacock
      'Dr. Tom Wilson': '8', // Graphite
      'Dr. Anna Smith': '9', // Blueberry
      'Dr. Mark Brown': '10', // Basil
      'Dr. Jane Doe': '11', // Tomato
    };

    // Get color based on doctor name, or use hash for consistent colors
    let colorId = '9'; // Default blue
    if (doctor_name) {
      if (colorMap[doctor_name]) {
        colorId = colorMap[doctor_name];
      } else {
        // Generate consistent color based on doctor name hash
        const hash = doctor_name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        colorId = String((hash % 11) + 1); // Colors 1-11
      }
    }

    // Build title with doctor/TR, machine, room
    const titleParts = [
      doctor_name ? (requiresDoctor ? `แพทย์: ${doctor_name}` : `พนักงาน TR: ${doctor_name}`) : '',
      treatment ? `เครื่อง: ${treatment}` : '',
      room_name ? `ห้อง: ${room_name}` : '',
    ];

    // Create event
    const event = {
      summary: titleParts.filter(Boolean).join(' | '),
      description: notes || '',
      start: {
        dateTime: startDateTime,
        timeZone: 'Asia/Bangkok',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Asia/Bangkok',
      },
      colorId: colorId,
    };

    // Use secondary calendar ID (set in environment variable)
    // If not set, fallback to 'primary'
    const calendarId = c.env.GOOGLE_CALENDAR_ID || 'primary';

    const result = await callGoogleCalendarAPI(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${googleToken}`,
      },
      body: JSON.stringify(event),
    });

    // Store event ID in database if booking_id provided
    if (booking_id) {
      await executeRun(
        c.env.DB,
        'UPDATE bookings SET google_event_id = ?, updated_at = datetime("now") WHERE id = ?',
        [result.id, booking_id]
      );
    }

    return c.json({
      success: true,
      event_id: result.id,
      event_link: result.htmlLink,
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update event in Google Calendar
calendar.put('/events/:eventId', async (c) => {
  try {
    const googleToken = await getAccessToken(c);
    const { eventId } = c.req.param();
    const { booking_id, title, patient_name, doctor_name, treatment, start_time, end_time, notes } = await c.req.json();

    // Get procedure name from booking to check if doctor is required
    let requiresDoctor = true;
    if (booking_id) {
      const procedureResult = await executeQuery(
        c.env.DB,
        `SELECT p.name 
         FROM booking_procedures bp
         JOIN procedures p ON bp.procedure_id = p.id
         WHERE bp.booking_id = ?
         LIMIT 1`,
        [booking_id]
      );
      if (procedureResult.length > 0) {
        requiresDoctor = !isStaffOnlyProcedureName(procedureResult[0].name);
      }
    }

    // Check if machine/treatment is staff only (no doctor) - use centralized logic
    if (treatment && isStaffOnlyProcedureName(treatment)) {
      requiresDoctor = false;
    }

    const updates = {};

    if (doctor_name || treatment) {
      const titleParts = [
        doctor_name ? (requiresDoctor ? `แพทย์: ${doctor_name}` : `พนักงาน TR: ${doctor_name}`) : '',
        treatment ? `เครื่อง: ${treatment}` : '',
      ];
      updates.summary = titleParts.filter(Boolean).join(' | ');
    }

    if (notes !== undefined) {
      updates.description = notes || '';
    }

    if (start_time) {
      updates.start = {
        dateTime: toThaiISOString(start_time),
        timeZone: 'Asia/Bangkok',
      };
    }

    if (end_time) {
      updates.end = {
        dateTime: toThaiISOString(end_time),
        timeZone: 'Asia/Bangkok',
      };
    }

    const calendarId = c.env.GOOGLE_CALENDAR_ID || 'primary';

    const result = await callGoogleCalendarAPI(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${googleToken}`,
      },
      body: JSON.stringify(updates),
    });

    return c.json({
      success: true,
      event_id: result.id,
      event_link: result.htmlLink,
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete event from Google Calendar
calendar.delete('/events/:eventId', async (c) => {
  try {
    const googleToken = await getAccessToken(c);
    const { eventId } = c.req.param();

    const calendarId = c.env.GOOGLE_CALENDAR_ID || 'primary';

    await callGoogleCalendarAPI(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${googleToken}`,
      },
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Sync all bookings to Google Calendar
calendar.post('/sync', async (c) => {
  try {
    const googleToken = await getAccessToken(c);
    const { start_date, end_date, booking_type, sync_mode, user_id } = await c.req.json();

    // Get bookings from database with procedure names
    let query = `
      SELECT 
        b.*,
        d.name as doctor_name,
        m.name as machine_name,
        r.name as room_name,
        (SELECT p.name FROM booking_procedures bp 
         JOIN procedures p ON bp.procedure_id = p.id 
         WHERE bp.booking_id = b.id LIMIT 1) as procedure_name
      FROM bookings b
      LEFT JOIN users d ON b.doctor_id = d.id AND d.role IN ('DOCTOR', 'TR')
      LEFT JOIN machines m ON b.machine_id = m.id
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.status = 'CONFIRMED'
    `;

    const params = [];

    // Filter by sync mode
    if (sync_mode && user_id) {
      if (sync_mode === 'mine') {
        // Sync only bookings created by current user
        query += ' AND b.user_id = ?';
        params.push(user_id);
      } else if (sync_mode === 'as-doctor') {
        // Sync only bookings where current user is the doctor
        query += ' AND b.doctor_id = ?';
        params.push(user_id);
      }
      // If sync_mode === 'all', no additional filter
    }

    // Filter by booking type if provided (handle NULL values)
    if (booking_type) {
      query += ' AND b.booking_type = ?';
      params.push(booking_type);
    }

    if (start_date) {
      query += ' AND b.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND b.date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY b.date, b.start_time';

    const bookings = await executeQuery(c.env.DB, query, params);

    if (bookings.length === 0) {
      return c.json({
        success: true,
        total: 0,
        created: 0,
        updated: 0,
        recreated: 0,
        errors: 0,
        results: [],
        message: 'No bookings found to sync'
      });
    }

    const results = [];
    for (const booking of bookings) {
      try {
        // Create datetime strings (FORCE THAI TIMEZONE)
        const startDateTime = new Date(`${booking.date}T${booking.start_time}+07:00`).toISOString();
        const endDateTime = new Date(`${booking.date}T${booking.end_time}+07:00`).toISOString();

        // Assign color based on doctor name (for variety)
        const colorMap = {
          'DR.Leo': '1', // Lavender
          'Dr. Michael Chen': '2', // Sage
          'Dr. Sarah Wong': '3', // Grape
          'Dr. James Kim': '4', // Flamingo
          'Dr. Emily Park': '5', // Banana
          'Dr. David Lee': '6', // Tangerine
          'Dr. Lisa Chen': '7', // Peacock
          'Dr. Tom Wilson': '8', // Graphite
          'Dr. Anna Smith': '9', // Blueberry
          'Dr. Mark Brown': '10', // Basil
          'Dr. Jane Doe': '11', // Tomato
        };

        // Get color based on doctor name, or use hash for consistent colors
        let colorId = '9'; // Default blue
        if (booking.doctor_name) {
          if (colorMap[booking.doctor_name]) {
            colorId = colorMap[booking.doctor_name];
          } else {
            // Generate consistent color based on doctor name hash
            const hash = booking.doctor_name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            colorId = String((hash % 11) + 1); // Colors 1-11
          }
        }

        // Build title with doctor, machine, room (handle consultation bookings)
        let titleParts = [];
        
        // Check if this is a consultation booking
        const isConsultation = booking.booking_type === 'CONSULTATION' || booking.is_consult_only === 1;
        
        if (isConsultation) {
          // For consultation bookings: show doctor (if any) and room
          titleParts = [
            booking.doctor_name ? `แพทย์: ${booking.doctor_name}` : '',
            booking.room_name ? `ห้องปรึกษา: ${booking.room_name}` : '',
          ];
        } else {
          // For procedure bookings: use existing logic
          let requiresDoctor = !isStaffOnlyProcedureName(booking.procedure_name || '');

          const noDoctorMachines = ['D-Cool', 'Tesla', 'Plasmalis', 'Diode'];
          if (booking.machine_name && noDoctorMachines.some(m => booking.machine_name.toLowerCase().includes(m.toLowerCase()))) {
            requiresDoctor = false;
          }

          titleParts = [
            booking.doctor_name ? (requiresDoctor ? `แพทย์: ${booking.doctor_name}` : `พนักงาน TR: ${booking.doctor_name}`) : '',
            booking.machine_name ? `เครื่อง: ${booking.machine_name}` : '',
            booking.room_name ? `ห้อง: ${booking.room_name}` : '',
          ];
        }

        // Create event
        const event = {
          summary: titleParts.filter(Boolean).join(' | '),
          description: booking.notes || '',
          start: {
            dateTime: startDateTime,
            timeZone: 'Asia/Bangkok',
          },
          end: {
            dateTime: endDateTime,
            timeZone: 'Asia/Bangkok',
          },
          colorId: colorId,
          status: 'confirmed', // Force status to confirmed to restore if it was deleted
        };

        const calendarId = c.env.GOOGLE_CALENDAR_ID || 'primary';

        let result;
        let status;

        // Check if already synced - update instead of create
        if (booking.google_event_id) {
          try {
            // Try to update existing event
            result = await callGoogleCalendarAPI(`/calendars/${encodeURIComponent(calendarId)}/events/${booking.google_event_id}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${googleToken}`,
              },
              body: JSON.stringify(event),
            });
            status = 'updated';
          } catch (updateError) {
            // If update fails (event might be deleted), create new one
            result = await callGoogleCalendarAPI(`/calendars/${encodeURIComponent(calendarId)}/events`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${googleToken}`,
              },
              body: JSON.stringify(event),
            });

            // Update booking with new event ID
            await executeRun(
              c.env.DB,
              'UPDATE bookings SET google_event_id = ?, updated_at = datetime("now") WHERE id = ?',
              [result.id, booking.id]
            );
            status = 'recreated';
          }
        } else {
          // Create new event
          result = await callGoogleCalendarAPI(`/calendars/${encodeURIComponent(calendarId)}/events`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${googleToken}`,
            },
            body: JSON.stringify(event),
          });

          // Update booking with event ID
          await executeRun(
            c.env.DB,
            'UPDATE bookings SET google_event_id = ?, updated_at = datetime("now") WHERE id = ?',
            [result.id, booking.id]
          );
          status = 'created';
        }

        results.push({
          booking_id: booking.id,
          event_id: result.id,
          status: status,
        });
      } catch (error) {
        results.push({
          booking_id: booking.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    const errorResults = results.filter(r => r.status === 'error');
    return c.json({
      success: true,
      total: bookings.length,
      created: results.filter(r => r.status === 'created').length,
      updated: results.filter(r => r.status === 'updated').length,
      recreated: results.filter(r => r.status === 'recreated').length,
      errors: errorResults.length,
      results,
      message: errorResults.length > 0 
        ? `Synced ${results.filter(r => r.status === 'created').length} created, ${results.filter(r => r.status === 'updated').length} updated, ${results.filter(r => r.status === 'recreated').length} recreated. Errors: ${errorResults.map(e => e.error).join(', ')}`
        : `Synced ${results.filter(r => r.status === 'created').length} created, ${results.filter(r => r.status === 'updated').length} updated, ${results.filter(r => r.status === 'recreated').length} recreated`
    });
  } catch (error) {
    console.error('Sync error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default calendar;
