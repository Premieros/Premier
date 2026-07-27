import { useAuth } from '../context/AuthContext';

/**
 * Returns the branch_id filter for the current user.
 * - Admin: null (sees all branches)
 * - Non-admin: their assigned branch_id
 */
export function useBranchFilter(): string | null {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'admin') return null;
  return user.branch_id || null;
}

/**
 * Returns true if the current user is an admin.
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === 'admin';
}
