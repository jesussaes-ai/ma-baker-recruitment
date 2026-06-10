import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN") || "";
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN") || "";
const GMAIL_SENDER_EMAIL = Deno.env.get("GMAIL_SENDER_EMAIL") || "";
const MAIL_FROM = Deno.env.get("MAIL_FROM") || "Ma Baker and Chef <no-reply@mabakerandchef.com>";
const EMAIL_PROVIDER_PRIORITY = (Deno.env.get("EMAIL_PROVIDER_PRIORITY") || "gmail,resend,postmark,brevo")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

type MailPayload = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  meta?: Record<string, unknown>;
};

type SendResult = {
  ok: boolean;
  provider: string;
  id?: string | null;
  detail?: unknown;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalizeRecipients(to: string | string[]): string[] {
  const raw = Array.isArray(to) ? to : [to];
  return raw
    .map((v) => String(v || "").trim().toLowerCase())
    .filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
}

function hasProviderCredentials(provider: string): boolean {
  if (provider === "gmail") {
    return !!GOOGLE_CLIENT_ID && !!GOOGLE_CLIENT_SECRET && !!GOOGLE_REFRESH_TOKEN && !!GMAIL_SENDER_EMAIL;
  }
  if (provider === "resend") return !!RESEND_API_KEY;
  if (provider === "postmark") return !!POSTMARK_SERVER_TOKEN;
  if (provider === "brevo") return !!BREVO_API_KEY;
  return false;
}

function utf8ToBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function getGoogleAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data?.access_token) {
    throw new Error(`google_oauth_error: ${JSON.stringify(data)}`);
  }
  return String(data.access_token);
}

async function sendWithGmail(payload: { to: string[]; subject: string; text?: string; html?: string; }): Promise<SendResult> {
  const accessToken = await getGoogleAccessToken();
  const toHeader = payload.to.join(", ");
  const mimeLines = [
    `From: ${MAIL_FROM || GMAIL_SENDER_EMAIL}`,
    `To: ${toHeader}`,
    `Subject: ${payload.subject.slice(0, 140)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    payload.text || payload.html || "",
  ];
  const raw = utf8ToBase64Url(mimeLines.join("\r\n"));

  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, provider: "gmail", detail: data };
  return { ok: true, provider: "gmail", id: data?.id || null, detail: data };
}

async function sendWithResend(payload: { to: string[]; subject: string; text?: string; html?: string; }): Promise<SendResult> {
  const body = {
    from: MAIL_FROM,
    to: payload.to,
    subject: payload.subject.slice(0, 140),
    text: payload.text || undefined,
    html: payload.html || undefined,
  };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      // Evita duplicados en reintentos de red/proveedor durante 24h.
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, provider: "resend", detail: data };
  return { ok: true, provider: "resend", id: data?.id || null, detail: data };
}

async function sendWithPostmark(payload: { to: string[]; subject: string; text?: string; html?: string; }): Promise<SendResult> {
  const body = {
    From: MAIL_FROM,
    To: payload.to.join(","),
    Subject: payload.subject.slice(0, 140),
    TextBody: payload.text || undefined,
    HtmlBody: payload.html || undefined,
    MessageStream: "outbound",
  };
  const r = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, provider: "postmark", detail: data };
  return { ok: true, provider: "postmark", id: data?.MessageID || null, detail: data };
}

async function sendWithBrevo(payload: { to: string[]; subject: string; text?: string; html?: string; }): Promise<SendResult> {
  const body = {
    sender: { email: MAIL_FROM.match(/<([^>]+)>/)?.[1] || MAIL_FROM, name: MAIL_FROM.split("<")[0].trim() || "Ma Baker and Chef" },
    to: payload.to.map((email) => ({ email })),
    subject: payload.subject.slice(0, 140),
    textContent: payload.text || undefined,
    htmlContent: payload.html || undefined,
  };
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, provider: "brevo", detail: data };
  return { ok: true, provider: "brevo", id: data?.messageId || null, detail: data };
}

async function sendWithProvider(provider: string, payload: { to: string[]; subject: string; text?: string; html?: string; }) {
  if (provider === "gmail") return sendWithGmail(payload);
  if (provider === "resend") return sendWithResend(payload);
  if (provider === "postmark") return sendWithPostmark(payload);
  if (provider === "brevo") return sendWithBrevo(payload);
  return { ok: false, provider, detail: { error: "provider_not_supported" } } as SendResult;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const configuredProviders = EMAIL_PROVIDER_PRIORITY.filter((p) => hasProviderCredentials(p));
  if (!configuredProviders.length) {
    return json({
      ok: false,
      error: "missing_email_provider_credentials",
      detail: "Configura al menos una: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN/GMAIL_SENDER_EMAIL, RESEND_API_KEY, POSTMARK_SERVER_TOKEN o BREVO_API_KEY",
    }, 500);
  }

  let payload: MailPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const recipients = normalizeRecipients(payload.to);
  const subject = String(payload.subject || "").trim();
  const text = String(payload.text || "").trim();
  const html = String(payload.html || "").trim();

  if (!recipients.length) return json({ ok: false, error: "invalid_recipient" }, 400);
  if (!subject) return json({ ok: false, error: "missing_subject" }, 400);
  if (!text && !html) return json({ ok: false, error: "missing_body" }, 400);

  const attempts: Array<{ provider: string; ok: boolean; detail?: unknown }> = [];
  for (const provider of configuredProviders) {
    try {
      const result = await sendWithProvider(provider, { to: recipients, subject, text, html });
      attempts.push({ provider: result.provider, ok: result.ok, detail: result.detail });
      if (result.ok) {
        return json({
          ok: true,
          provider: result.provider,
          id: result.id || null,
          to: recipients,
          meta: payload.meta || {},
          attempts,
        });
      }
    } catch (e) {
      attempts.push({
        provider,
        ok: false,
        detail: { error: "unexpected_provider_error", message: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  return json({ ok: false, error: "all_providers_failed", attempts }, 502);
});
