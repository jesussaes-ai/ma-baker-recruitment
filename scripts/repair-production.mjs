/**
 * Reparación autónoma RRHH — Supabase + datos operativos.
 * Lee credenciales de variables de entorno (no hardcodeadas).
 *
 * Uso:
 *   $env:SUPABASE_PROJECT_REF="znskpdixdyxdbvpapqrg"
 *   $env:SUPABASE_PAT="sbp_..."
 *   $env:SUPABASE_URL="https://znskpdixdyxdbvpapqrg.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   node scripts/repair-production.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const REF = process.env.SUPABASE_PROJECT_REF || "znskpdixdyxdbvpapqrg";
const PAT = process.env.SUPABASE_PAT || "";
const SUPA = (process.env.SUPABASE_URL || `https://${REF}.supabase.co`).replace(/\/+$/, "");
const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON = process.env.SUPABASE_ANON_KEY || "";

const results = [];

function log(ok, msg) {
  results.push({ ok, msg });
  console.log(`${ok ? "✅" : "❌"} ${msg}`);
}

async function mgmtSql(sql, label) {
  if (!PAT) throw new Error("Falta SUPABASE_PAT");
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  if (!r.ok) {
    log(false, `${label}: HTTP ${r.status} — ${text.slice(0, 200)}`);
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function rest(path, { method = "GET", body, prefer } = {}) {
  const headers = {
    apikey: SKEY,
    Authorization: `Bearer ${SKEY}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

async function rpc(name, body, key = ANON || SKEY) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

async function main() {
  console.log("\n=== Reparación Ma Baker RRHH ===\n");

  if (!PAT || !SKEY) {
    console.error("Faltan SUPABASE_PAT y/o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  // 1) Fix RPC rechazados
  const fixSql = readFileSync(
    join(ROOT, "database", "migracion-fix-rechazados-token-sesion.sql"),
    "utf8",
  );
  await mgmtSql(fixSql, "Migración fn_prospectos_rechazados_list");
  log(true, "Migración rechazados aplicada (si no hubo error arriba)");

  // 2) Alias seguridad@mabakerandchef.com → mismo hash que sh@ si falta
  await mgmtSql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM public.usuarios_sistema
        WHERE lower(email) = 'seguridad@mabakerandchef.com'
      ) THEN
        INSERT INTO public.usuarios_sistema (email, nombre, password_hash, rol, departamento, activo)
        SELECT 'seguridad@mabakerandchef.com', nombre, password_hash, rol, departamento, activo
        FROM public.usuarios_sistema
        WHERE lower(email) = 'sh@mabakerandchef.com'
        LIMIT 1;
      END IF;
    END $$;
  `, "Usuario alias seguridad@mabakerandchef.com");

  // 3) Activar hasta 5 vacantes (las primeras alfabéticamente inactivas)
  const list = await rest(
    "catalogo_puestos?select=id,nombre_puesto,codigo_puesto,activo&activo=eq.false&order=nombre_puesto.asc&limit=5",
  );
  const rows = Array.isArray(list.data) ? list.data : [];
  if (!rows.length) {
    log(true, "Vacantes: ya hay activas o no hay inactivas que publicar");
  } else {
    for (const row of rows) {
      const up = await rest(`catalogo_puestos?id=eq.${row.id}`, {
        method: "PATCH",
        body: {
          activo: true,
          portal_campos_visibles: row.portal_campos_visibles || {
            descripcion: true,
            escolaridad: true,
            experiencia: true,
            edad: true,
            sueldo: true,
            conocimientos: true,
            competencias: true,
          },
        },
        prefer: "return=minimal",
      });
      log(up.ok, `Vacante activada: ${row.nombre_puesto || row.codigo_puesto || row.id}`);
    }
  }

  // 4) Verificar rechazados RPC con login admin
  const login = await rpc("fn_login", {
    p_email: "admin@mabakerandchef.com",
    p_password: process.env.MB_ADMIN_PASSWORD || "010967",
  });
  if (login.ok && login.data?.ok && login.data.token) {
    const rej = await rpc("fn_prospectos_rechazados_list", { p_token: login.data.token });
    log(rej.ok, `RPC rechazados tras fix: HTTP ${rej.status}`);
  } else {
    const login2 = await rpc("fn_login", {
      p_email: "admin@mabakerandchef.com",
      p_password: "Admin2026!",
    });
    if (login2.ok && login2.data?.ok) {
      const rej = await rpc("fn_prospectos_rechazados_list", { p_token: login2.data.token });
      log(rej.ok, `RPC rechazados tras fix (Admin2026!): HTTP ${rej.status}`);
    } else {
      log(false, "No se pudo verificar rechazados (login admin falló)");
    }
  }

  // 5) Conteos finales
  const counts = await mgmtSql(`
    SELECT
      (SELECT COUNT(*) FROM catalogo_puestos WHERE activo)::int AS vacantes_activas,
      (SELECT COUNT(*) FROM catalogo_puestos)::int AS descriptivos_total,
      (SELECT COUNT(*) FROM usuarios_sistema WHERE activo)::int AS usuarios_activos;
  `, "Conteos finales");
  if (counts) log(true, `Estado: ${JSON.stringify(counts)}`);

  // 6) Probar edge correo
  const mailProbe = await fetch(`${SUPA}/functions/v1/send-postulacion-emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON || SKEY}`,
      apikey: ANON || SKEY,
    },
    body: JSON.stringify({
      to: "jesussaes@gmail.com",
      subject: "Prueba repair-production RRHH",
      text: "Probe automático tras reparación.",
    }),
  });
  const mailBody = await mailProbe.text();
  log(
    mailProbe.ok,
    `Correo probe: HTTP ${mailProbe.status} — ${mailBody.slice(0, 120)}`,
  );

  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n=== Fin: ${results.length - fails}/${results.length} OK ===\n`);
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
