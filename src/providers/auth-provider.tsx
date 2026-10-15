"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { authApi } from "@/lib/api";
import { ApiError, onAuthExpired } from "@/lib/api/client";
import { onSessionChange, session } from "@/lib/session";
import type { AuthResult, UserPublic, UserRole } from "@/types";

type AuthState = {
  user: UserPublic | null;
  /** True until the stored session has been checked against the API. */
  loading: boolean;
  isSignedIn: boolean;
  signIn: (result: AuthResult) => void;
  signOut: (options?: { redirectTo?: string }) => void;
  refresh: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  signInPath = "/login",
}: {
  children: React.ReactNode;
  signInPath?: string;
}) {
  const router = useRouter();
  const [user, setUser] = React.useState<UserPublic | null>(null);
  const [loading, setLoading] = React.useState(true);

  const signOut = React.useCallback(
    (options?: { redirectTo?: string }) => {
      session.clear();
      setUser(null);
      router.replace(options?.redirectTo ?? signInPath);
    },
    [router, signInPath],
  );

  const refresh = React.useCallback(async () => {
    if (!session.accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
      session.saveUser(me);
    } catch (error) {
      // A 401 has already cleared the session inside the client.
      if (!(error instanceof ApiError) || error.isUnauthorized) {
        session.clear();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Trust the cached user for the first paint, then confirm it with the API.
  React.useEffect(() => {
    setUser(session.user);
    void refresh();
  }, [refresh]);

  // Another tab signing in or out moves this one too.
  React.useEffect(() => onSessionChange(() => setUser(session.user)), []);

  // The API tells us when a token stopped working.
  React.useEffect(() => onAuthExpired(() => setUser(null)), []);

  const signIn = React.useCallback((result: AuthResult) => {
    session.save(result.tokens, result.user);
    setUser(result.user);
    setLoading(false);
  }, []);

  const value = React.useMemo<AuthState>(
    () => ({ user, loading, isSignedIn: Boolean(user), signIn, signOut, refresh }),
    [user, loading, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/**
 * Sends anyone who should not be here to the sign-in page.
 * Returns `ready` so the caller can hold the UI until the check is done —
 * rendering a protected page first and redirecting after is a visible flash.
 */
export function useRequireAuth(options?: { roles?: UserRole[]; signInPath?: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const signInPath = options?.signInPath ?? "/login";
  const roles = options?.roles;

  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(signInPath);
      return;
    }
    if (roles && !roles.includes(user.role)) router.replace("/");
  }, [user, loading, roles, router, signInPath]);

  const allowed = Boolean(user) && (!roles || (user ? roles.includes(user.role) : false));
  return { user, ready: !loading && allowed };
}
