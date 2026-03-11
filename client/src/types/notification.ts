export enum NotificationType {
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_UPDATED = 'BOOKING_UPDATED',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  USER_CREATED = 'USER_CREATED',
  RESOURCE_UNAVAILABLE = 'RESOURCE_UNAVAILABLE',
  SYSTEM = 'SYSTEM'
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_id?: string;
  related_type?: 'booking' | 'user' | 'room' | 'machine';
  is_read: number;
  created_at: string;
  read_at?: string;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
  unread_count: number;
}
