import { UserRole } from '../types/booking';

/**
 * Permission System
 * - Admin: Full access - can do everything
 * - Doctor: Read-only
 * - Sales: Can edit Doctor only
 * - CRM: Can edit all except CRM and Admin
 */

export const canView = (userRole: UserRole): boolean => {
  return true; // All roles can view
};

export const canEditDoctor = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN || userRole === UserRole.SALES || userRole === UserRole.CRM;
};

export const canEditSales = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN || userRole === UserRole.CRM;
};

export const canEditCRM = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN; // Only Admin can edit CRM
};

export const canEditAdmin = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN; // Only Admin can edit Admin
};

export const canEdit = (userRole: UserRole, targetRole: UserRole): boolean => {
  // Admin can edit everyone
  if (userRole === UserRole.ADMIN) {
    return true;
  }
  
  if (userRole === UserRole.DOCTOR) {
    return false; // Doctor is read-only
  }
  
  if (userRole === UserRole.SALES) {
    return targetRole === UserRole.DOCTOR; // Sales can only edit Doctor
  }
  
  if (userRole === UserRole.CRM) {
    return targetRole !== UserRole.CRM && targetRole !== UserRole.ADMIN; // CRM can edit all except CRM and Admin
  }
  
  return false;
};

export const canCreateBooking = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN || userRole === UserRole.SALES || userRole === UserRole.CRM;
};

export const canCancelBooking = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN || userRole === UserRole.SALES || userRole === UserRole.CRM;
};

export const canManageUsers = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN || userRole === UserRole.CRM;
};

export const canManageRooms = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN || userRole === UserRole.CRM;
};

export const canManageMachines = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN || userRole === UserRole.CRM;
};

export const isAdmin = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN;
};
