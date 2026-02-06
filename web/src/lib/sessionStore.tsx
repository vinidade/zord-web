"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";

type SessionState = {
  session: Session | null;
  loading: boolean;
};

const SessionContext = createContext<SessionState>({
  session: null,
  loading: true,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!supabaseClient) {
        if (isMounted) {
          setSession(null);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabaseClient.auth.getSession();
      if (isMounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    };

    void init();

    const { data: listener } = supabaseClient
      ? supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
          if (isMounted) {
            setSession(nextSession);
            setLoading(false);
          }
        })
      : { data: { subscription: null } };

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(() => ({ session, loading }), [session, loading]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
