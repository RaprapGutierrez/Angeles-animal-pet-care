import { supabase } from './supabase';

export const logActivity = async (user, action, details = '', status = 'Success') => {
  if (!user?.id) return;
  await supabase.from('activity_logs').insert([{
    user_id:   user.id,
    user_name: user.fullName || user.email,
    user_role: user.role,
    action,
    details,
    status,
  }]);
};