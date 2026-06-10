import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BUCKET = Deno.env.get("CANDIDATOS_DOCS_BUCKET") || "expedientes-candidatos";

type UploadPayload = {
  documentType: string;
  fileName: string;
  mimeType: string;
  base64: string;
  candidateId?: string | null;
  candidateEmail?: string;
  candidateName?: string;
  puestoCodigo?: string;
  origenPostulacion?: string;
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

function sanitizePart(v: string) {
  return String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function safeExt(fileName: string, mimeType: string) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (["pdf", "jpg", "jpeg", "png", "webp"].includes(ext)) return ext;
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "bin";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ ok: false, error: "missing_supabase_env" }, 500);
  }

  let payload: UploadPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const documentType = sanitizePart(payload.documentType || "");
  const fileName = String(payload.fileName || "").trim();
  const mimeType = String(payload.mimeType || "application/octet-stream").trim();
  const base64 = String(payload.base64 || "").trim();
  const candidateEmail = String(payload.candidateEmail || "").trim().toLowerCase();
  const candidateName = String(payload.candidateName || "").trim();
  const puestoCodigo = String(payload.puestoCodigo || "").trim().toUpperCase();
  const origenPostulacion = String(payload.origenPostulacion || "").trim().toUpperCase();

  if (!documentType || !fileName || !base64) {
    return json({ ok: false, error: "missing_required_fields" }, 400);
  }
  if (!candidateEmail) return json({ ok: false, error: "missing_candidate_email" }, 400);

  let bin: Uint8Array;
  try {
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    bin = bytes;
  } catch {
    return json({ ok: false, error: "invalid_base64" }, 400);
  }

  if (bin.byteLength > 10 * 1024 * 1024) {
    return json({ ok: false, error: "file_too_large" }, 413);
  }

  const ext = safeExt(fileName, mimeType);
  const candidateRef = sanitizePart(payload.candidateId || candidateEmail || "unknown");
  const objectPath = `${candidateRef}/${documentType}/${Date.now()}-${sanitizePart(fileName)}.${ext}`;

  const uploadResp = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": mimeType,
        "x-upsert": "false",
      },
      body: bin,
    },
  );
  const uploadData = await uploadResp.json().catch(() => ({}));
  if (!uploadResp.ok) {
    return json({ ok: false, error: "storage_upload_failed", detail: uploadData }, 502);
  }

  const docRecord = {
    candidato_id: payload.candidateId || null,
    candidato_email: candidateEmail,
    candidato_nombre: candidateName || null,
    codigo_puesto: puestoCodigo || null,
    origen_postulacion: origenPostulacion || null,
    tipo_documento: documentType,
    nombre_archivo: fileName,
    mime_type: mimeType,
    storage_bucket: BUCKET,
    storage_path: objectPath,
    tamano_bytes: bin.byteLength,
    estado_revision: "pendiente",
    fecha_carga: new Date().toISOString(),
  };

  const dbResp = await fetch(`${SUPABASE_URL}/rest/v1/candidato_documentos`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(docRecord),
  });
  const dbData = await dbResp.json().catch(() => ({}));
  if (!dbResp.ok) {
    return json({ ok: false, error: "db_insert_failed", detail: dbData }, 502);
  }

  return json({
    ok: true,
    bucket: BUCKET,
    path: objectPath,
    documentoId: Array.isArray(dbData) && dbData[0]?.id ? dbData[0].id : null,
  });
});
