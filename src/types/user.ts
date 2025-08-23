export type UserRole = 'customer' | 'vendor' | 'admin';

export interface AppUser {
  id: string;
  auth_user_id: string;
  display_name?: string | null;
  created_at: string;
  roles: UserRole[];
}

export interface UserRoleRecord {
  app_user_id: string;
  role: UserRole;
  granted_at: string;
}

export interface UserRolesSummary {
  app_user_id: string;
  auth_user_id: string;
  display_name?: string | null;
  created_at: string;
  roles: UserRole[];
  role_granted_dates: string[];
}

// Helper functions
export const hasRole = (user: AppUser | null, role: UserRole): boolean => {
  return !!user && user.roles?.includes(role);
};

export const hasAnyRole = (user: AppUser | null, roles: UserRole[]): boolean => {
  return !!user && roles.some(role => user.roles?.includes(role));
};

export const isAdmin = (user: AppUser | null): boolean => hasRole(user, 'admin');
export const isVendor = (user: AppUser | null): boolean => hasRole(user, 'vendor');
export const isCustomer = (user: AppUser | null): boolean => hasRole(user, 'customer');

export const canAccessAdmin = (user: AppUser | null): boolean => isAdmin(user);
export const canAccessVendor = (user: AppUser | null): boolean => hasAnyRole(user, ['vendor', 'admin']);
export const canAccessCustomer = (user: AppUser | null): boolean => hasAnyRole(user, ['customer', 'vendor', 'admin']);

// Role hierarchy (for permission checks)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  customer: 1,
  vendor: 2,
  admin: 3
};

export const hasRoleOrHigher = (user: AppUser | null, minimumRole: UserRole): boolean => {
  if (!user) return false;
  const userMaxRole = Math.max(...user.roles.map(role => ROLE_HIERARCHY[role]));
  return userMaxRole >= ROLE_HIERARCHY[minimumRole];
};




