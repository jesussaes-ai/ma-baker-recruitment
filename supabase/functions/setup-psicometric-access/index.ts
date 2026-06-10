import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PSYCHOMETRIC_PUBLIC_URL = (Deno.env.get("PSYCHOMETRIC_PUBLIC_URL") || "").replace(/\/$/, "");
const TOKEN_TTL_DAYS = Number(Deno.env.get("PSYCHOMETRIC_TOKEN_TTL_DAYS") || "7");

type SetupPayload = {
  candidatoId?: string;
  codigoPuesto?: string;
  email?: string;
  nombre?: string;
  publicBaseUrl?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function sb(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("apikey", SERVICE_ROLE_KEY);
  headers.set("Authorization", `Bearer ${SERVICE_ROLE_KEY}`);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
  const text = await r.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ ok: false, error: "missing_supabase_env" }, 500);
  }

  let payload: SetupPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const candidatoId = String(payload.candidatoId || "").trim();
  if (!isUuid(candidatoId)) return json({ ok: false, error: "invalid_candidato_id" }, 400);

  const publicBase = PSYCHOMETRIC_PUBLIC_URL || String(payload.publicBaseUrl || "").replace(/\/$/, "");
  const linkFor = (token: string) => {
    if (!publicBase) return null;
    const sep = publicBase.includes("?") ? "&" : "?";
    return `${publicBase}${sep}token=${encodeURIComponent(token)}`;
  };

  const existing = await sb(
    `evaluaciones_psicometricas?id_candidato=eq.${candidatoId}&estado=in.(pendiente,en_proceso)&select=id,token_acceso,token_expira,estado&limit=1`,
  );

  if (existing.ok && Array.isArray(existing.data) && existing.data.length) {
    const row = existing.data[0] as { id: string; token_acceso?: string; token_expira?: string; estado?: string };
    const token = String(row.token_acceso || "");
    if (token) {
      return json({
        ok: true,
        reused: true,
        evaluacionId: row.id,
        token,
        link: linkFor(token),
        expiresAt: row.token_expira || null,
      });
    }
  }

  const token = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const insert = await sb("evaluaciones_psicometricas", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id_candidato: candidatoId,
      token_acceso: token,
      token_enviado_en: now.toISOString(),
      token_expira: expires.toISOString(),
      estado: "pendiente",
      version_prueba_aplicada: "1.0",
    }),
  });

  if (!insert.ok) {
    return json({ ok: false, error: "insert_failed", detail: insert.data }, 502);
  }

  const rows = Array.isArray(insert.data) ? insert.data : [];
  const evaluacionId = rows[0]?.id || null;

  await sb(`candidatos_activos?id=eq.${candidatoId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ fase_actual: "espera_psicometricos" }),
  }).catch(() => null);

  return json({
    ok: true,
    reused: false,
    evaluacionId,
    token,
    link: linkFor(token),
    expiresAt: expires.toISOString(),
    codigoPuesto: payload.codigoPuesto || null,
    email: payload.email || null,
  });
});
