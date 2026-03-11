// ============================================================
// REAL API — เรียก backend API จริง
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  async login(data: { email: string; password: string }) {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<any>(res);
    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }
    return result;
  },
  async register(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },
  async getCurrentUser(token: string) {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { ...getAuthHeaders(), 'Authorization': `Bearer ${token}` },
    });
    return handleResponse<any>(res);
  },
  async getGoogleAuthUrl(): Promise<{ url: string }> {
    const res = await fetch(`${API_BASE_URL}/api/auth/google/url`);
    return handleResponse<{ url: string }>(res);
  },
};

// ── Calendar ──────────────────────────────────────────────────
export const calendarApi = {
  async getAuthUrl(): Promise<{ url: string }> {
    const res = await fetch(`${API_BASE_URL}/api/calendar/auth/url`);
    return handleResponse<{ url: string }>(res);
  },
  async exchangeCode(code: string, redirectUri?: string) {
    const res = await fetch(`${API_BASE_URL}/api/calendar/auth/callback`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });
    return handleResponse<any>(res);
  },
  async sync(token: string, ...rest: any[]) {
    const res = await fetch(`${API_BASE_URL}/api/calendar/sync`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(rest),
    });
    return handleResponse<any>(res);
  },
  async createEvent(token: string, event: any) {
    const res = await fetch(`${API_BASE_URL}/api/calendar/events`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(event),
    });
    return handleResponse<any>(res);
  },
  async updateEvent(token: string, eventId: string, updates: any) {
    const res = await fetch(`${API_BASE_URL}/api/calendar/events/${eventId}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(res);
  },
  async deleteEvent(token: string, eventId: string) {
    const res = await fetch(`${API_BASE_URL}/api/calendar/events/${eventId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders(), 'Authorization': `Bearer ${token}` },
    });
    return handleResponse<any>(res);
  },
};

// ── Appointments (legacy) ─────────────────────────────────────
export const appointmentsApi = {
  async getAll() { return bookingsApi.getAll(); },
  async getById(id: string) { return bookingsApi.getById(id); },
  async create(appt: any) { return bookingsApi.create(appt); },
  async update(id: string, updates: any) { return bookingsApi.update(id, updates); },
  async delete(id: string) { return bookingsApi.delete(id); },
};

// ── Rooms ─────────────────────────────────────────────────────
export const roomsApi = {
  async getAll(options?: { type?: string }) {
    const params = options?.type ? `?type=${options.type}` : '';
    const res = await fetch(`${API_BASE_URL}/api/rooms${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getAvailable(options?: { type?: string }) {
    const params = options?.type ? `?type=${options.type}` : '';
    const res = await fetch(`${API_BASE_URL}/api/rooms/available${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getAvailability(id: string, date?: string) {
    const params = date ? `?date=${date}` : '';
    const res = await fetch(`${API_BASE_URL}/api/rooms/${id}/availability${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async getById(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async create(room: any) {
    const res = await fetch(`${API_BASE_URL}/api/rooms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(room),
    });
    return handleResponse<any>(res);
  },
  async update(id: string, updates: any) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(res);
  },
  async delete(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
};

// ── Machines ──────────────────────────────────────────────────
export const machinesApi = {
  async getAll(options?: { category?: string; include_procedures?: boolean }) {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.include_procedures) params.append('include_procedures', 'true');
    const query = params.toString() ? `?${params}` : '';
    const res = await fetch(`${API_BASE_URL}/api/machines${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getAvailable(options?: { category?: string }) {
    const params = options?.category ? `?category=${options.category}` : '';
    const res = await fetch(`${API_BASE_URL}/api/machines/available${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getAvailability(id: string, date?: string) {
    const params = date ? `?date=${date}` : '';
    const res = await fetch(`${API_BASE_URL}/api/machines/${id}/availability${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async getByType(type: string) {
    const res = await fetch(`${API_BASE_URL}/api/machines?type=${type}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getById(id: string, includeProcedures = false) {
    const params = includeProcedures ? '?include_procedures=true' : '';
    const res = await fetch(`${API_BASE_URL}/api/machines/${id}${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async create(machine: any) {
    const res = await fetch(`${API_BASE_URL}/api/machines`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(machine),
    });
    return handleResponse<any>(res);
  },
  async update(id: string, updates: any) {
    const res = await fetch(`${API_BASE_URL}/api/machines/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(res);
  },
  async delete(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/machines/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
};

// ── Procedures ────────────────────────────────────────────────
export const proceduresApi = {
  async getAll(isActive?: boolean) {
    const params = isActive !== undefined ? `?is_active=${isActive}` : '';
    const res = await fetch(`${API_BASE_URL}/api/procedures${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getById(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/procedures/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async getByMachine(machineId: string) {
    const res = await fetch(`${API_BASE_URL}/api/machines/${machineId}/procedures`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getMachines(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/procedures/${id}/machines`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async create(procedure: any) {
    const res = await fetch(`${API_BASE_URL}/api/procedures`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(procedure),
    });
    return handleResponse<any>(res);
  },
  async update(id: string, updates: any) {
    const res = await fetch(`${API_BASE_URL}/api/procedures/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(res);
  },
  async delete(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/procedures/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async linkToMachine(procedureId: string, machineId: string) {
    const res = await fetch(`${API_BASE_URL}/api/procedures/${procedureId}/machines/${machineId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async unlinkFromMachine(procedureId: string, machineId: string) {
    const res = await fetch(`${API_BASE_URL}/api/procedures/${procedureId}/machines/${machineId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async bulkLinkToMachine(machineId: string, procedureIds: string[]) {
    const res = await fetch(`${API_BASE_URL}/api/machines/${machineId}/procedures/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ procedure_ids: procedureIds }),
    });
    return handleResponse<any>(res);
  },
};

// ── Bookings ──────────────────────────────────────────────────
export const bookingsApi = {
  async getAll(options?: { type?: string }) {
    const params = options?.type ? `?type=${options.type}` : '';
    const res = await fetch(`${API_BASE_URL}/api/bookings${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getByDate(date: string) {
    const res = await fetch(`${API_BASE_URL}/api/bookings?date=${date}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getByStatus(status: string) {
    const res = await fetch(`${API_BASE_URL}/api/bookings?status=${status}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getById(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async validate(booking: any) {
    const res = await fetch(`${API_BASE_URL}/api/bookings/validate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(booking),
    });
    return handleResponse<any>(res);
  },
  async create(booking: any) {
    const res = await fetch(`${API_BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(booking),
    });
    return handleResponse<any>(res);
  },
  async update(id: string, updates: any) {
    const res = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(res);
  },
  async cancel(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/bookings/${id}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async delete(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async checkAvailability(date: string, startTime: string, endTime: string) {
    const res = await fetch(`${API_BASE_URL}/api/bookings/check-availability`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ date, start_time: startTime, end_time: endTime }),
    });
    return handleResponse<any>(res);
  },
};

// ── Users ─────────────────────────────────────────────────────
export const usersApi = {
  async getAll() {
    const res = await fetch(`${API_BASE_URL}/api/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getById(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async getAvailability(id: string, date?: string) {
    const params = date ? `?date=${date}` : '';
    const res = await fetch(`${API_BASE_URL}/api/users/${id}/availability${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async create(user: any) {
    const res = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(user),
    });
    return handleResponse<any>(res);
  },
  async update(id: string, updates: any) {
    const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(res);
  },
  async delete(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
};

// ── Health ────────────────────────────────────────────────────
export const healthApi = {
  async check() {
    const res = await fetch(`${API_BASE_URL}/`);
    return handleResponse<any>(res);
  },
};

// ── Notifications ─────────────────────────────────────────────
export const notificationsApi = {
  async getAll(unreadOnly = false, limit = 50) {
    const params = `?unread_only=${unreadOnly}&limit=${limit}`;
    const res = await fetch(`${API_BASE_URL}/api/notifications${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },
  async getUnreadCount() {
    const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ count: number }>(res);
  },
  async markAsRead(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async markAllAsRead() {
    const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  async delete(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
};
