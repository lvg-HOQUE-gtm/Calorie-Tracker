// Supabase Edge Function: delete-account
//
// Permanently removes the calling auth user. food_logs, scan_usage, and
// profiles all reference auth.users with ON DELETE CASCADE, so those rows
// go with the account. The JS client cannot delete auth.users itself.

import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/**
 * Reads the caller's user id out of the bearer token.
 *
 * Supabase has already cryptographically verified this JWT before the
 * request reaches us (verify_jwt is enabled), so decoding the payload
 * without re-verifying the signature is safe here.
 */
function getUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const segments = authHeader.slice("Bearer ".length).split(".");
  if (segments.length !== 3) return null;

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return jsonResponse({ error: "Could not identify the caller from the auth token." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[delete-account] Missing Supabase service credentials.");
    return jsonResponse({ error: "Account deletion is not configured on the server." }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[delete-account] deleteUser failed:", error.message);
    return jsonResponse({ error: "Couldn't delete this account. Please try again." }, 500);
  }

  return jsonResponse({ ok: true }, 200);
});
