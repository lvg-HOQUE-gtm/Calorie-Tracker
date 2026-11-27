import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "./supabase";
import type { MealAnalysis, MealPhoto } from "../types";

/** A scanned-but-not-yet-saved meal, held while the user goes through the auth gate. */
export interface PendingMeal {
  analysis: MealAnalysis;
  photo: MealPhoto;
  contextText: string;
}

interface SessionContextValue {
  /** Null only during the very first boot, before the anonymous session lands. */
  session: Session | null;
  user: User | null;
  /** True once we've resolved (or created) an initial session. */
  isReady: boolean;
  /** True while a guest (anonymous) session is active. */
  isAnonymous: boolean;
  /** True once the user has a real, permanent account. */
  isAuthenticated: boolean;
  pendingMeal: PendingMeal | null;
  setPendingMeal: (meal: PendingMeal | null) => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pendingMeal, setPendingMeal] = useState<PendingMeal | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const { data } = await supabase.auth.getSession();
        let currentSession = data.session;

        // Step 1 of the user journey: silently ensure a guest identity exists
        // so the very first scan can be persisted before any signup form.
        if (!currentSession) {
          const { data: anonData, error } = await supabase.auth.signInAnonymously();
          if (error) {
            // eslint-disable-next-line no-console
            console.warn("[Ahaar AI] Anonymous sign-in failed:", error.message);
          } else {
            currentSession = anonData.session;
          }
        }

        if (mounted) {
          setSession(currentSession ?? null);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("[Ahaar AI] Session bootstrap failed:", error);
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    void bootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setPendingMeal(null);
    // Immediately re-establish a guest session so the app always has an
    // active identity to log against -- there is never a true "logged out,
    // no session at all" state in this app's model.
    await supabase.auth.signInAnonymously();
  }, []);

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      throw new Error(messageFromDeleteError(error));
    }
    setPendingMeal(null);
    await supabase.auth.signOut();
    await supabase.auth.signInAnonymously();
  }, []);

  const value = useMemo<SessionContextValue>(() => {
    const user = session?.user ?? null;
    const isAnonymous = Boolean(user?.is_anonymous);
    return {
      session,
      user,
      isReady,
      isAnonymous,
      isAuthenticated: Boolean(user) && !isAnonymous,
      pendingMeal,
      setPendingMeal,
      signOut,
      deleteAccount,
    };
  }, [session, isReady, pendingMeal, signOut, deleteAccount]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function messageFromDeleteError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  const lower = raw.toLowerCase();
  if (
    isSupabaseConfigured &&
    (lower.includes("not found") ||
      lower.includes("404") ||
      lower.includes("failed to send") ||
      lower.includes("edge function"))
  ) {
    return "Account deletion isn't available yet. Deploy the delete-account Edge Function, then try again.";
  }
  return raw || "Couldn't delete your account.";
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
