import { useState, useCallback } from 'react';

/**
 * useNotificationDialog
 * 
 * Shared hook for the notification dialog pattern used across components.
 * Eliminates the duplicated state + setter boilerplate in:
 * - AppointmentsCalendar.tsx
 * - BookingSystem.tsx
 * - MeetingBookingSystem.tsx
 * - DashboardOverview.tsx
 * etc.
 */

export interface NotificationDialogState {
  open: boolean;
  title: string;
  description: string;
  type: 'success' | 'error' | 'loading';
}

const INITIAL_STATE: NotificationDialogState = {
  open: false,
  title: '',
  description: '',
  type: 'success',
};

export function useNotificationDialog() {
  const [state, setState] = useState<NotificationDialogState>(INITIAL_STATE);

  const show = useCallback((title: string, description: string, type: 'success' | 'error' | 'loading') => {
    setState({ open: true, title, description, type });
  }, []);

  const showSuccess = useCallback((title: string, description: string) => {
    setState({ open: true, title, description, type: 'success' });
  }, []);

  const showError = useCallback((title: string, description: string) => {
    setState({ open: true, title, description, type: 'error' });
  }, []);

  const showLoading = useCallback((title: string, description: string) => {
    setState({ open: true, title, description, type: 'loading' });
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, open }));
  }, []);

  return {
    state,
    show,
    showSuccess,
    showError,
    showLoading,
    close,
    setOpen,
  };
}
