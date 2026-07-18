import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { id } from "@instantdb/react";
import { db } from "../db";

type AuthUser = {
  id: string;
  email?: string;
};

type AuthContextValue = {
  isLoading: boolean;
  user: AuthUser | null;
  username: string | null;
  signInWithGoogle: () => Promise<{ error?: string }>;
  saveUsername: (username: string) => Promise<{ error?: string }>;
  signOut: () => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const { isLoading: authLoading, user: instantUser } = db.useAuth();

  const { data: profileData, isLoading: profileLoading } = db.useQuery(
    instantUser
      ? {
          profiles: {
            $: { where: { "user.id": instantUser.id } },
          },
        }
      : null,
  );

  const isLoading = authLoading || (!!instantUser && profileLoading);
  const user: AuthUser | null = instantUser
    ? { id: instantUser.id, email: instantUser.email ?? undefined }
    : null;
  const username =
    (profileData?.profiles?.[0] as { username?: string } | undefined)?.username ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      user,
      username,
      async signInWithGoogle() {
        try {
          const url = db.auth.createAuthorizationURL({
            clientName: "google-web",
            redirectURL: window.location.origin,
          });
          window.location.href = url;
          return {};
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
      async saveUsername(nextUsername) {
        if (!instantUser) {
          return { error: "Not signed in." };
        }

        const normalizedUsername = nextUsername.trim().toLowerCase();
        const existingProfile = profileData?.profiles?.[0] as
          | { id?: string }
          | undefined;

        try {
          const profileId = existingProfile?.id ?? id();
          await db.transact(
            db.tx.profiles[profileId]
              .update({ username: normalizedUsername })
              .link({ user: instantUser.id }),
          );
          return {};
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
      async signOut() {
        try {
          await db.auth.signOut();
          return {};
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    }),
    [isLoading, user, username, instantUser, profileData],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
