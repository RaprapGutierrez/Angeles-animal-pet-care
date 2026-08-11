import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL           = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON          = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const memoryStore = new Map();

const safeStorage = {
  getItem: (key) => {
    try { return window.localStorage.getItem(key); }
    catch {
      try { return window.sessionStorage.getItem(key); }
      catch { return memoryStore.get(key) ?? null; }
    }
  },
  setItem: (key, value) => {
    try { window.localStorage.setItem(key, value); return; }
    catch {}
    try { window.sessionStorage.setItem(key, value); return; }
    catch {}
    memoryStore.set(key, value);
  },
  removeItem: (key) => {
    try { window.localStorage.removeItem(key); } catch {}
    try { window.sessionStorage.removeItem(key); } catch {}
    memoryStore.delete(key);
  },
};

// Main client — uses anon key, respects RLS
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    storage:            safeStorage,
  },
  realtime: {
    params: { eventsPerSecond: 0 },
  },
});

// Temporary: points to anon key until admin actions are migrated to a
// backend endpoint. auth.admin.* calls will fail safely (permission error)
// rather than exposing a service role key in the browser.
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ── Thin helper layer ──
export const sb = {
  getUser() {
    try { return JSON.parse(localStorage.getItem('sb_user')); }
    catch { return null; }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      try {
        localStorage.setItem('sb_token',         data.session?.access_token  ?? '');
        localStorage.setItem('sb_refresh_token', data.session?.refresh_token ?? '');
        localStorage.setItem('hospital_jwt',     data.session?.access_token  ?? '');
        localStorage.setItem('sb_user',          JSON.stringify(data.user));
      } catch { /* blocked */ }
      return { data, user: data.user };
    } catch (err) {
      return { error: { message: err.message } };
    }
  },

  async signOut() {
    try {
      const stored = localStorage.getItem('sb_user');
      const user = stored ? JSON.parse(stored) : null;
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ status: 'Inactive' })
          .eq('id', user.id);
      }
    } catch { /* ignore */ }

    await supabase.auth.signOut();
    ['sb_token', 'sb_refresh_token', 'hospital_jwt', 'sb_user', 'user_role'].forEach(k => {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    });
  },

  async insert(table, rowData) {
    try {
      const { data, error } = await supabase.from(table).insert(rowData).select();
      if (error) return { error };
      return { data };
    } catch (err) {
      return { error: { message: err.message } };
    }
  },

  async update(table, match, rowData) {
    try {
      let query = supabase.from(table).update(rowData);
      Object.entries(match).forEach(([k, v]) => { query = query.eq(k, v); });
      const { data, error } = await query.select();
      if (error) return { error };
      return { data };
    } catch (err) {
      return { error: { message: err.message } };
    }
  },

  async delete(table, match) {
    try {
      let query = supabase.from(table).delete();
      Object.entries(match).forEach(([k, v]) => { query = query.eq(k, v); });
      const { error } = await query;
      if (error) { console.error(`sb.delete(${table}):`, error); return false; }
      return true;
    } catch { return false; }
  },

  async from(table, query = '*') {
    try {
      const { data, error } = await supabase.from(table).select(query);
      if (error) { console.error(`sb.from(${table}):`, error); return []; }
      return data ?? [];
    } catch { return []; }
  },
};

export const logActivity = async (supabase, { userId, userName, userRole, action, details = "", status = "Success" }) => {
  await supabase.from("activity_logs").insert([{
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    action,
    details,
    status,
  }]);
};

export default supabase;
