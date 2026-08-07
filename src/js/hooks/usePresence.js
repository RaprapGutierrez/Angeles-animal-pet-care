import { useEffect, useState } from 'react';
import { supabase } from '../Utils/supabase';

// Singleton so every component sharing this hook reuses one channel/subscription.
let presenceChannel = null;
let onlineIds = new Set();
const listeners = new Set();

function ensureChannel(userId) {
  if (presenceChannel || !userId) return;
  presenceChannel = supabase.channel('online-users', {
    config: { presence: { key: userId } },
  });
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      onlineIds = new Set(Object.keys(state));
      listeners.forEach((cb) => cb(new Set(onlineIds)));
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ online_at: new Date().toISOString() });
      }
    });
}

// Returns a live Set of user IDs currently connected to the app.
// A user only appears here while their browser tab/session is actually open —
// closing the tab or losing connection removes them automatically.
export function usePresence(currentUserId) {
  const [online, setOnline] = useState(new Set());
  useEffect(() => {
    if (!currentUserId) return;
    ensureChannel(currentUserId);
    const cb = (ids) => setOnline(ids);
    listeners.add(cb);
    setOnline(new Set(onlineIds));
    return () => { listeners.delete(cb); };
  }, [currentUserId]);
  return online;
}