import { useEffect, useState } from "react";
import { supabase } from "../Utils/supabase";

// Singleton so every component sharing this hook reuses one channel/subscription,
// but the channel is keyed to a specific userId — if the logged-in user changes
// (logout/login in the same tab), the old channel must be torn down and a new
// one created keyed to the new user, or presence stays bound to the stale user.
let presenceChannel = null;
let presenceUserId = null;
let onlineIds = new Set();
const listeners = new Set();

function teardownChannel() {
  if (presenceChannel) {
    supabase.removeChannel(presenceChannel);
    presenceChannel = null;
    presenceUserId = null;
    onlineIds = new Set();
    listeners.forEach((cb) => cb(new Set(onlineIds)));
  }
}

function ensureChannel(userId) {
  if (!userId) {
    teardownChannel();
    return;
  }
  // Already have a channel for this exact user — nothing to do.
  if (presenceChannel && presenceUserId === userId) return;

  // Either no channel yet, or it's stale (bound to a different/previous user).
  teardownChannel();

  presenceUserId = userId;
  presenceChannel = supabase.channel("online-users", {
    config: { presence: { key: userId } },
  });
  presenceChannel
    .on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState();
      onlineIds = new Set(Object.keys(state));
      listeners.forEach((cb) => cb(new Set(onlineIds)));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
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
    if (!currentUserId) {
      teardownChannel();
      setOnline(new Set());
      return;
    }
    ensureChannel(currentUserId);
    const cb = (ids) => setOnline(ids);
    listeners.add(cb);
    setOnline(new Set(onlineIds));
    return () => {
      listeners.delete(cb);
    };
  }, [currentUserId]);
  return online;
}
