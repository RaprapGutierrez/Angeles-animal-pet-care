// src/js/useBranchFilter.js
import { useCurrentUser } from './useCurrentUser';

/**
 * Returns applyFilter(query) — adds .eq('branch_id', branchId) for
 * managers/employees/customers, or passes the query untouched for
 * super_admin and admin.
 *
 * Usage:
 *   const { applyFilter, branchId, seeAllBranches } = useBranchFilter();
 *   const { data } = await applyFilter(supabase.from('appointments').select('*'));
 */
export const useBranchFilter = () => {
  const { user, seeAllBranches, loading } = useCurrentUser();

  const applyFilter = (query, { ignoreRoleFilter = false } = {}) => {
    if (ignoreRoleFilter) return query;
    if (!user?.branchId) return query;
    return query.eq('branch_id', user.branchId);
  };

  return { applyFilter, branchId: user?.branchId ?? null, seeAllBranches, loading, user };
};

/**
 * Attach branch_id to an insert/update payload.
 * Pass the current user object directly.
 *
 * Usage:
 *   const payload = withBranchId(user, { name: 'Buddy', ... });
 */
export const withBranchId = (user, payload) => {
  if (!user?.branchId) return payload;
  return { ...payload, branch_id: user.branchId };
};