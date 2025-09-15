// src/hooks/useUserProfile.js
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function useUserProfile() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      const sess = sessionData?.session ?? null;
      if (!mounted) return;
      setSession(sess);

      if (sess?.user?.id) {
        const { data: prof, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", sess.user.id)
          .single();
        if (!error) setProfile(prof);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }
    init();

    // optional: subscribe to auth changes so UI updates if user logs out/in
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sessionData) => {
      // update session + profile on event
      if (sessionData?.session?.user?.id) {
        (async () => {
          setSession(sessionData.session);
          const { data: prof } = await supabase
            .from("users")
            .select("*")
            .eq("id", sessionData.session.user.id)
            .single();
          setProfile(prof);
        })();
      } else {
        setSession(null);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe?.();
    };
  }, []);

  return { session, profile, loading };
}
