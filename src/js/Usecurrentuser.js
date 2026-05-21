import { useState, useEffect } from 'react';
import { supabase } from './supabase';

let _cache = null;

export const useCurrentUser = () => {
  const [user, setUser]       = useState(_cache);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) { setUser(_cache); setLoading(false); return; }

    const fetch = async () => {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, branch_id, status')
        .eq('id', authUser.id)
        .single();

      const result = {
        id:        authUser.id,
        email:     authUser.email,
        firstName: profile?.first_name || '',
        lastName:  profile?.last_name  || '',
        fullName:  [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || authUser.email,
        role:      (profile?.role || '').toLowerCase(),
        branchId:  profile?.branch_id ?? null,
        status:    profile?.status     || 'Active',
      };

      _cache = result;
      setUser(result);
      setLoading(false);
    };

    fetch();
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin      = user?.role === 'admin' || isSuperAdmin;
  const isManager    = user?.role === 'manager';
  const isEmployee   = user?.role === 'employee' || user?.role === 'staff';
  const isCustomer   = user?.role === 'customer';
  const seeAllBranches = isAdmin;

  return { user, loading, isSuperAdmin, isAdmin, isManager, isEmployee, isCustomer, seeAllBranches };
};

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    _cache = null;
    try { localStorage.removeItem('user_role'); } catch {}
  }
});