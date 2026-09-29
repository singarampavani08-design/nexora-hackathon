/**
 * Authentication Context for Nexora.
 *
 * Provides real Supabase Authentication paired with a seamless Demo Executive login.
 * Manages user session state, local persistence, login/signup/signout actions.
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "./supabase/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  company?: string;
  avatarUrl?: string;
  isDemo?: boolean;
}

export const DEMO_USER: AuthUser = {
  id: "usr_demo_executive",
  email: "pavani.singaram@nexora.ai",
  name: "Pavani Singaram",
  role: "Lead AI Product Architect",
  company: "Nexora Labs",
  isDemo: true,
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, pass: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (name: string, email: string, pass: string, company?: string) => Promise<{ ok: boolean; error?: string }>;
  signInAsDemo: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "nexora_auth_profile";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initAuth(): Promise<void> {
      try {
        // 1. Check local cached profile first
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch {
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        // 2. Check Supabase session
        const sb = getSupabase();
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
          const u: AuthUser = {
            id: session.user.id,
            email: session.user.email ?? "",
            name: session.user.user_metadata?.["full_name"] ?? session.user.email?.split("@")[0] ?? "User",
            company: session.user.user_metadata?.["company"] ?? "Executive",
            role: session.user.user_metadata?.["role"] ?? "Member",
            isDemo: false,
          };
          setUser(u);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        }

        // 3. Listen to auth state changes
        const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            const u: AuthUser = {
              id: session.user.id,
              email: session.user.email ?? "",
              name: session.user.user_metadata?.["full_name"] ?? session.user.email?.split("@")[0] ?? "User",
              company: session.user.user_metadata?.["company"] ?? "Executive",
              role: session.user.user_metadata?.["role"] ?? "Member",
              isDemo: false,
            };
            setUser(u);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
          } else {
            // If logged out from Supabase and not a demo user
            if (!user?.isDemo) {
              setUser(null);
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        });

        unsubscribe = () => subscription.unsubscribe();
      } catch (err) {
        console.warn("[nexora:auth] failed to load session:", err);
      } finally {
        setLoading(false);
      }
    }

    void initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, pass: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      setLoading(true);
      // Check if email matches demo
      if (email.toLowerCase().includes("demo") || email.toLowerCase() === DEMO_USER.email.toLowerCase()) {
        signInAsDemo();
        return { ok: true };
      }

      const sb = getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data.user) {
        const u: AuthUser = {
          id: data.user.id,
          email: data.user.email ?? email,
          name: data.user.user_metadata?.["full_name"] ?? email.split("@")[0],
          company: data.user.user_metadata?.["company"] ?? "Enterprise",
          role: data.user.user_metadata?.["role"] ?? "Member",
          isDemo: false,
        };
        setUser(u);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        return { ok: true };
      }

      return { ok: false, error: "Unable to sign in. Please verify your credentials." };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Sign in failed" };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    name: string,
    email: string,
    pass: string,
    company?: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      setLoading(true);
      const sb = getSupabase();
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: name.trim(),
            company: company?.trim() || "Organization",
          },
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data.user) {
        const u: AuthUser = {
          id: data.user.id,
          email: data.user.email ?? email,
          name: name.trim(),
          company: company?.trim() || "Organization",
          role: "Member",
          isDemo: false,
        };
        setUser(u);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        return { ok: true };
      }

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Sign up failed" };
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemo = () => {
    setUser(DEMO_USER);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
  };

  const signOut = async () => {
    try {
      const sb = getSupabase();
      await sb.auth.signOut();
    } catch {
      /* ignore */
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        signIn,
        signUp,
        signInAsDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
