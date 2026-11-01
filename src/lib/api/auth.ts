import type { Role, User } from "@/types";
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from "@/lib/schemas";
import { useAuth, type SessionDto } from "@/lib/store/auth";
import { useShelfStatus } from "@/lib/store/shelf-status";
import { validate } from "./client";
import { api } from "./http";

/** Seeded by the backend (app/db/seed.py) and offered on the sign-in page. */
export const DEMO_ACCOUNT = { email: "demo@storyshelf.in", password: "publish123" };

export async function login(input: LoginInput): Promise<User> {
  const body = validate(loginSchema, input);
  const session = await api<SessionDto>("/auth/login", { method: "POST", body });
  useAuth.getState().setSession(session);
  return session.user;
}

export async function signup(input: SignupInput, role: Exclude<Role, "admin"> = "reader"): Promise<User> {
  const { name, email, password } = validate(signupSchema, input);
  const session = await api<SessionDto>("/auth/signup", { method: "POST", body: { name, email, password, role } });
  useAuth.getState().setSession(session);
  return session.user;
}

/** Ends the session on the server too (revokes the refresh-token family); local sign-out never waits on it. */
export async function logout(): Promise<void> {
  const refreshToken = useAuth.getState().tokens?.refreshToken;
  useAuth.getState().signOut();
  useShelfStatus.getState().reset();
  if (refreshToken) await api("/auth/logout", { method: "POST", body: { refreshToken } }).catch(() => undefined);
}

/** Re-reads the account (role or plan may have changed since sign-in). */
export async function me(): Promise<User> {
  const user = await api<User>("/auth/me");
  const s = useAuth.getState();
  if (s.tokens) useAuth.setState({ user });
  return user;
}
