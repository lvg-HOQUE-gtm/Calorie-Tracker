import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "")
  .trim()
  .replace(/^['"]|['"]$/g, "");
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "")
  .trim()
  .replace(/^['"]|['"]$/g, "");

/** True when real Supabase credentials are present in the build. */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !/your-project-ref|your-anon-key/i.test(supabaseUrl) &&
    !/your-project-ref|your-anon-key/i.test(supabaseAnonKey)
);

/**
 * The single Supabase client used across the app.
 *
 * When `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are not
 * present (e.g. a fresh checkout that hasn't configured a backend yet), we
 * fall back to a small local "demo" client that implements only the subset
 * of the supabase-js surface this app actually calls: anonymous sign-in,
 * email/password auth (including the anonymous -> permanent upgrade), the
 * `food_logs` / `profiles` tables, and `functions.invoke` (including
 * demo-mode account deletion). This keeps the full onboarding -> scan ->
 * auth gate -> dashboard -> profile journey demoable with zero setup.
 *
 * Defined at the bottom of this file: the demo classes below are not hoisted,
 * so constructing the client here would throw in demo mode.
 */
export let supabase: SupabaseClient;

if (!isSupabaseConfigured && __DEV__) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Ahaar AI] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. " +
      "Running against a local in-memory demo backend instead of Supabase."
  );
}

// ---------------------------------------------------------------------------
// Demo backend (used only when Supabase credentials are missing)
// ---------------------------------------------------------------------------

interface DemoUser {
  id: string;
  email: string | null;
  password: string | null;
  isAnonymous: boolean;
  createdAt: string;
}

interface DemoSession {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  expires_at: number;
  user: DemoUserPublic;
}

interface DemoUserPublic {
  id: string;
  email?: string;
  is_anonymous: boolean;
  created_at: string;
  aud: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

type AuthChangeEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "USER_UPDATED"
  | "TOKEN_REFRESHED";

type AuthChangeCallback = (event: AuthChangeEvent, session: DemoSession | null) => void;

const DEMO_SESSION_KEY = "ahaar_ai_demo_session";
const DEMO_USERS_KEY = "ahaar_ai_demo_users";
const DEMO_TABLE_PREFIX = "ahaar_ai_demo_table_";

function toPublicUser(user: DemoUser): DemoUserPublic {
  return {
    id: user.id,
    email: user.email ?? undefined,
    is_anonymous: user.isAnonymous,
    created_at: user.createdAt,
    aud: "authenticated",
    app_metadata: { provider: user.isAnonymous ? "anonymous" : "email" },
    user_metadata: {},
  };
}

async function uuid(): Promise<string> {
  return Crypto.randomUUID();
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

class DemoAuthClient {
  private session: DemoSession | null = null;
  private listeners = new Set<AuthChangeCallback>();
  private ready: Promise<void>;

  constructor() {
    this.ready = this.hydrate();
  }

  private async hydrate() {
    this.session = await readJson<DemoSession | null>(DEMO_SESSION_KEY, null);
  }

  private async persistSession(session: DemoSession | null) {
    this.session = session;
    if (session) {
      await writeJson(DEMO_SESSION_KEY, session);
    } else {
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
    }
  }

  private notify(event: AuthChangeEvent) {
    for (const listener of this.listeners) {
      listener(event, this.session);
    }
  }

  private async getUsers(): Promise<DemoUser[]> {
    return readJson<DemoUser[]>(DEMO_USERS_KEY, []);
  }

  private async saveUsers(users: DemoUser[]) {
    await writeJson(DEMO_USERS_KEY, users);
  }

  private async createSessionFor(user: DemoUser): Promise<DemoSession> {
    const session: DemoSession = {
      access_token: `demo-${user.id}-${Date.now()}`,
      refresh_token: `demo-refresh-${user.id}`,
      token_type: "bearer",
      expires_in: 60 * 60 * 24 * 365,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
      user: toPublicUser(user),
    };
    await this.persistSession(session);
    return session;
  }

  async getSession() {
    await this.ready;
    return { data: { session: this.session }, error: null };
  }

  onAuthStateChange(callback: AuthChangeCallback) {
    this.listeners.add(callback);
    void this.ready.then(() => callback("INITIAL_SESSION", this.session));
    return {
      data: {
        subscription: {
          unsubscribe: () => this.listeners.delete(callback),
        },
      },
    };
  }

  async signInAnonymously() {
    await this.ready;
    const users = await this.getUsers();
    const user: DemoUser = {
      id: await uuid(),
      email: null,
      password: null,
      isAnonymous: true,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    await this.saveUsers(users);
    const session = await this.createSessionFor(user);
    this.notify("SIGNED_IN");
    return { data: { session, user: session.user }, error: null };
  }

  /**
   * Upgrades the *currently signed-in* user (typically anonymous) to a
   * permanent email/password account, preserving their user id so any rows
   * already written (e.g. food_logs) stay attributed to the same account.
   * Mirrors real Supabase's `auth.updateUser` upgrade path.
   */
  async updateUser(attrs: { email?: string; password?: string }) {
    await this.ready;
    if (!this.session) {
      return { data: { user: null }, error: new Error("Not authenticated") };
    }
    const users = await this.getUsers();
    const idx = users.findIndex((u) => u.id === this.session!.user.id);
    if (idx === -1) {
      return { data: { user: null }, error: new Error("User not found") };
    }
    if (attrs.email && users.some((u, i) => i !== idx && u.email === attrs.email)) {
      return { data: { user: null }, error: new Error("Email already registered") };
    }
    users[idx] = {
      ...users[idx],
      email: attrs.email ?? users[idx].email,
      password: attrs.password ?? users[idx].password,
      isAnonymous: false,
    };
    await this.saveUsers(users);
    const session = await this.createSessionFor(users[idx]);
    this.notify("USER_UPDATED");
    return { data: { user: session.user }, error: null };
  }

  async signUp({ email, password }: { email: string; password: string }) {
    await this.ready;
    const users = await this.getUsers();

    // If there's an active anonymous session, upgrade it in place instead of
    // minting a brand new user, so scans made before signup are preserved.
    if (this.session?.user.is_anonymous) {
      return this.updateUser({ email, password });
    }

    if (users.some((u) => u.email === email)) {
      return { data: { user: null, session: null }, error: new Error("Email already registered") };
    }
    const user: DemoUser = {
      id: await uuid(),
      email,
      password,
      isAnonymous: false,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    await this.saveUsers(users);
    const session = await this.createSessionFor(user);
    this.notify("SIGNED_IN");
    return { data: { user: session.user, session }, error: null };
  }

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    await this.ready;
    const users = await this.getUsers();
    const user = users.find((u) => u.email === email);
    if (!user || user.password !== password) {
      return { data: { user: null, session: null }, error: new Error("Invalid login credentials") };
    }
    const session = await this.createSessionFor(user);
    this.notify("SIGNED_IN");
    return { data: { user: session.user, session }, error: null };
  }

  async signOut() {
    await this.persistSession(null);
    this.notify("SIGNED_OUT");
    return { error: null };
  }

  async removeCurrentUser() {
    await this.ready;
    if (!this.session) {
      return { error: new Error("Not authenticated") };
    }
    const userId = this.session.user.id;
    const users = (await this.getUsers()).filter((user) => user.id !== userId);
    await this.saveUsers(users);
    await this.persistSession(null);
    this.notify("SIGNED_OUT");
    return { error: null };
  }
}

type FilterOp = { col: string; op: "eq" | "gte" | "lte"; value: unknown };
type OrderSpec = { col: string; ascending: boolean };

class DemoQueryBuilder<T extends Record<string, unknown>> implements PromiseLike<{ data: unknown; error: Error | null }> {
  private filters: FilterOp[] = [];
  private orderSpec: OrderSpec | null = null;
  private limitCount: number | null = null;
  private wantsSingle: "single" | "maybeSingle" | null = null;
  private pendingInsert: T[] | null = null;
  private pendingUpdate: Partial<T> | null = null;
  private pendingUpsert: T[] | null = null;
  private isDelete = false;

  constructor(private table: string) {}

  private storageKey() {
    return `${DEMO_TABLE_PREFIX}${this.table}`;
  }

  private async readRows(): Promise<T[]> {
    return readJson<T[]>(this.storageKey(), []);
  }

  private async writeRows(rows: T[]) {
    await writeJson(this.storageKey(), rows);
  }

  select(_columns?: string) {
    return this;
  }

  insert(rows: T | T[]) {
    this.pendingInsert = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(patch: Partial<T>) {
    this.pendingUpdate = patch;
    return this;
  }

  upsert(rows: T | T[], _opts?: { onConflict?: string }) {
    this.pendingUpsert = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(col: string, value: unknown) {
    this.filters.push({ col, op: "eq", value });
    return this;
  }

  gte(col: string, value: unknown) {
    this.filters.push({ col, op: "gte", value });
    return this;
  }

  lte(col: string, value: unknown) {
    this.filters.push({ col, op: "lte", value });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderSpec = { col, ascending: opts?.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.wantsSingle = "single";
    return this;
  }

  maybeSingle() {
    this.wantsSingle = "maybeSingle";
    return this;
  }

  private matches(row: T): boolean {
    return this.filters.every((f) => {
      const rowValue = row[f.col as keyof T];
      if (f.op === "eq") return rowValue === f.value;
      if (f.op === "gte") return String(rowValue) >= String(f.value);
      if (f.op === "lte") return String(rowValue) <= String(f.value);
      return true;
    });
  }

  private async execute(): Promise<{ data: unknown; error: Error | null }> {
    try {
      let rows = await this.readRows();

      if (this.pendingUpsert) {
        const now = new Date().toISOString();
        const upserted: T[] = [];
        for (const row of this.pendingUpsert) {
          const conflictKey =
            "user_id" in row && row.user_id != null ? "user_id" : "id";
          const conflictValue = row[conflictKey as keyof T];
          const idx = rows.findIndex(
            (existing) => existing[conflictKey as keyof T] === conflictValue
          );
          if (idx >= 0) {
            const next = { ...rows[idx], ...row, updated_at: now } as T;
            rows[idx] = next;
            upserted.push(next);
          } else {
            const withDefaults = {
              id: "id" in row && row.id ? row.id : await uuid(),
              created_at: now,
              updated_at: now,
              ...row,
            } as T;
            rows.push(withDefaults);
            upserted.push(withDefaults);
          }
        }
        await this.writeRows(rows);
        return this.shapeResult(upserted);
      }

      if (this.pendingInsert) {
        const now = new Date().toISOString();
        const inserted: T[] = [];
        for (const row of this.pendingInsert) {
          const withDefaults = {
            id: await uuid(),
            created_at: now,
            ...row,
          } as T;
          rows.push(withDefaults);
          inserted.push(withDefaults);
        }
        await this.writeRows(rows);
        return this.shapeResult(inserted);
      }

      if (this.pendingUpdate) {
        const updated: T[] = [];
        rows = rows.map((row) => {
          if (this.matches(row)) {
            const next = { ...row, ...this.pendingUpdate } as T;
            updated.push(next);
            return next;
          }
          return row;
        });
        await this.writeRows(rows);
        return this.shapeResult(updated);
      }

      if (this.isDelete) {
        const remaining = rows.filter((row) => !this.matches(row));
        const removedCount = rows.length - remaining.length;
        await this.writeRows(remaining);
        return this.shapeResult(new Array(removedCount).fill({}) as T[]);
      }

      let result = rows.filter((row) => this.matches(row));
      if (this.orderSpec) {
        const { col, ascending } = this.orderSpec;
        result = [...result].sort((a, b) => {
          const av = String(a[col as keyof T]);
          const bv = String(b[col as keyof T]);
          return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      if (this.limitCount != null) {
        result = result.slice(0, this.limitCount);
      }
      return this.shapeResult(result);
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error("Demo query failed") };
    }
  }

  private shapeResult(rows: T[]): { data: unknown; error: Error | null } {
    if (this.wantsSingle === "single") {
      return rows[0]
        ? { data: rows[0], error: null }
        : { data: null, error: new Error("No rows found") };
    }
    if (this.wantsSingle === "maybeSingle") {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  then<TResult1 = { data: unknown; error: Error | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

function createDemoSupabaseClient() {
  const auth = new DemoAuthClient();
  return {
    auth,
    from<T extends Record<string, unknown>>(table: string) {
      return new DemoQueryBuilder<T>(table);
    },
    functions: {
      async invoke(functionName: string) {
        if (functionName === "delete-account") {
          const { data } = await auth.getSession();
          const userId = data.session?.user.id;
          if (!userId) {
            return { data: null, error: new Error("Not authenticated") };
          }
          await new DemoQueryBuilder("food_logs").eq("user_id", userId).delete();
          await new DemoQueryBuilder("scan_usage").eq("user_id", userId).delete();
          await new DemoQueryBuilder("profiles").eq("user_id", userId).delete();
          await auth.removeCurrentUser();
          return { data: { ok: true }, error: null };
        }
        return {
          data: null,
          error: new Error("Edge Functions are not available in demo mode"),
        };
      },
    },
  };
}

supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (createDemoSupabaseClient() as unknown as SupabaseClient);
