/**
 * Auditoría de readiness — Ma Baker and Chef Recruitment
 * Pruebas API (Supabase) + UI física (Playwright) contra localhost:8080
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.MB_BASE_URL || "http://localhost:8080";
const SUPA = "https://znskpdixdyxdbvpapqrg.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2twZGl4ZHl4ZGJ2cGFwcXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTg4MDgsImV4cCI6MjA4ODQzNDgwOH0.MvOASVc-0XkqtfeKp_FBZ4hcE_jFSsGB53KQTTgFRCQ";

const ADMIN = {
  email: "admin@mabakerandchef.com",
  password: "010967",
};

const RESULTS = [];
const OUT_DIR = join(__dirname, "..", "tmp", "audit-readiness");

function ok(id, detail) {
  RESULTS.push({ id, status: "PASS", detail });
  console.log(`✅ PASS  ${id}${detail ? " — " + detail : ""}`);
}
function fail(id, detail) {
  RESULTS.push({ id, status: "FAIL", detail });
  console.log(`❌ FAIL  ${id} — ${detail}`);
}
function warn(id, detail) {
  RESULTS.push({ id, status: "WARN", detail });
  console.log(`⚠️  WARN  ${id} — ${detail}`);
}
function info(id, detail) {
  RESULTS.push({ id, status: "INFO", detail });
  console.log(`ℹ️  INFO  ${id} — ${detail}`);
}

async function rpc(name, body, token) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: r.status, ok: r.ok, data };
}

async function restGet(path) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, ok: r.ok, data };
}

async function probeEdge(url, method = "OPTIONS") {
  try {
    const r = await fetch(url, { method });
    return { status: r.status, ok: r.status < 500, headers: Object.fromEntries(r.headers) };
  } catch (e) {
    return { status: 0, ok: false, error: String(e.message || e) };
  }
}

async function apiAudit() {
  console.log("\n=== API / Supabase ===\n");

  // Login admin
  const login = await rpc("fn_login", {
    p_email: ADMIN.email,
    p_password: ADMIN.password,
  });
  if (login.ok && login.data?.ok && login.data?.token) {
    ok("api.fn_login.admin", `rol=${login.data.rol}`);
  } else {
    fail("api.fn_login.admin", JSON.stringify(login.data).slice(0, 200));
    return null;
  }
  const token = login.data.token;

  // Verificar sesión
  const ses = await rpc("fn_verificar_sesion", { p_token: token });
  if (ses.ok && ses.data?.ok !== false && (ses.data?.rol || ses.data?.ok)) {
    ok("api.fn_verificar_sesion", `rol=${ses.data.rol || "?"}`);
  } else {
    fail("api.fn_verificar_sesion", JSON.stringify(ses.data).slice(0, 200));
  }

  // Catálogo puestos (anon read — portal)
  const vacantesAnon = await restGet(
    "catalogo_puestos?select=id,nombre_puesto,activo&activo=eq.true&limit=5"
  );
  if (vacantesAnon.ok && Array.isArray(vacantesAnon.data)) {
    ok("api.catalogo_puestos.anon", `${vacantesAnon.data.length} activas (sample)`);
    if (vacantesAnon.data.length === 0) {
      warn("api.catalogo_puestos.empty", "No hay vacantes activas — portal vacío");
    }
  } else {
    fail("api.catalogo_puestos.anon", `HTTP ${vacantesAnon.status}`);
  }

  // RPC catálogo con sesión
  const cat = await rpc("fn_catalogo_puestos_list", { p_token: token });
  if (cat.ok && Array.isArray(cat.data)) {
    ok("api.fn_catalogo_puestos_list", `${cat.data.length} puestos`);
  } else if (cat.ok && cat.data?.ok === false) {
    fail("api.fn_catalogo_puestos_list", cat.data.error || "ok:false");
  } else {
    fail("api.fn_catalogo_puestos_list", `HTTP ${cat.status} ${JSON.stringify(cat.data).slice(0, 180)}`);
  }

  // Candidatos
  const cands = await rpc("fn_candidatos_list", {
    p_token: token,
    p_incluir_medico: false,
  });
  if (cands.ok && Array.isArray(cands.data)) {
    ok("api.fn_candidatos_list", `${cands.data.length} candidatos`);
    const fases = {};
    for (const c of cands.data) {
      const f = c.fase_actual || c.fase || "?";
      fases[f] = (fases[f] || 0) + 1;
    }
    info("api.candidatos.fases", JSON.stringify(fases));
  } else {
    fail("api.fn_candidatos_list", JSON.stringify(cands.data).slice(0, 200));
  }

  // Rechazados
  const rej = await rpc("fn_prospectos_rechazados_list", { p_token: token });
  if (rej.ok && Array.isArray(rej.data)) {
    ok("api.fn_prospectos_rechazados_list", `${rej.data.length} rechazados`);
  } else {
    fail("api.fn_prospectos_rechazados_list", JSON.stringify(rej.data).slice(0, 200));
  }

  // Logs
  const logs = await rpc("fn_sistema_logs_list", { p_token: token, p_limit: 10 });
  if (logs.ok && Array.isArray(logs.data)) {
    ok("api.fn_sistema_logs_list", `${logs.data.length} logs`);
  } else {
    fail("api.fn_sistema_logs_list", JSON.stringify(logs.data).slice(0, 200));
  }

  // Login inválido
  const bad = await rpc("fn_login", {
    p_email: ADMIN.email,
    p_password: "WRONG_PASSWORD_XYZ",
  });
  if (bad.ok && bad.data?.ok === false) {
    ok("api.fn_login.reject", bad.data.error || "rechazado");
  } else {
    fail("api.fn_login.reject", "debió fallar con password incorrecto");
  }

  // Edge functions
  const edges = [
    "send-postulacion-emails",
    "setup-psicometric-access",
    "upload-candidato-document",
  ];
  for (const name of edges) {
    const url = `${SUPA}/functions/v1/${name}`;
    const probe = await probeEdge(url, "POST");
    // Sin body: esperamos 4xx (auth/validation), no 404/5xx
    if (probe.status === 404) {
      fail(`edge.${name}`, "404 — no desplegada");
    } else if (probe.status >= 500) {
      fail(`edge.${name}`, `HTTP ${probe.status}`);
    } else if (probe.status === 0) {
      fail(`edge.${name}`, probe.error || "sin respuesta");
    } else {
      ok(`edge.${name}`, `HTTP ${probe.status} (endpoint vivo)`);
    }
  }

  // Alternate functions URL used in runtime-config
  const alt = await probeEdge(
    "https://znskpdixdyxdbvpapqrg.functions.supabase.co/send-postulacion-emails",
    "POST"
  );
  if (alt.status === 404) {
    warn("edge.alt_domain", "functions.supabase.co devolvió 404");
  } else if (alt.status === 0) {
    fail("edge.alt_domain", alt.error || "sin respuesta");
  } else {
    ok("edge.alt_domain", `HTTP ${alt.status}`);
  }

  return token;
}

async function uiAudit(token) {
  console.log("\n=== UI física (Playwright) ===\n");
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "es-MX",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  // Páginas públicas HTTP
  const publicPages = [
    "/login",
    "/login.html",
    "/index.html",
    "/ayuda.html",
    "/evaluacion-candidato.html",
    "/portal-candidato.html",
  ];
  for (const p of publicPages) {
    const resp = await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 30000 });
    const status = resp?.status() || 0;
    if (status >= 200 && status < 400) {
      ok(`ui.http${p}`, `HTTP ${status}`);
    } else {
      fail(`ui.http${p}`, `HTTP ${status}`);
    }
  }

  // Assets críticos
  for (const asset of [
    "/js/config.js",
    "/js/auth.js",
    "/js/app.js",
    "/js/runtime-config.js",
    "/js/dashboard.js",
    "/js/candidates-api.js",
    "/js/vacantes-api.js",
    "/js/contratacion-panel.js",
    "/styles/main.css",
  ]) {
    const r = await page.goto(BASE + asset, { waitUntil: "domcontentloaded", timeout: 15000 });
    if (r && r.ok()) ok(`ui.asset${asset}`, `HTTP ${r.status()}`);
    else fail(`ui.asset${asset}`, `HTTP ${r?.status()}`);
  }

  // Login page: brand + form
  await page.goto(BASE + "/login.html", { waitUntil: "networkidle", timeout: 45000 });
  const brand = await page.locator("text=Ma Baker and Chef").first().count();
  if (brand > 0) ok("ui.login.brand", "nombre oficial visible");
  else fail("ui.login.brand", "no se ve Ma Baker and Chef");

  const hasForm = await page.locator("#loginForm").count();
  if (hasForm) ok("ui.login.form", "formulario presente");
  else fail("ui.login.form", "sin #loginForm");

  // ¿Carga config/runtime en login?
  const hasConfig = await page.evaluate(() => !!(window.MB_CONFIG && window.MB_CONFIG.SUPABASE_URL));
  const hasDemo = await page.evaluate(
    () => !!(window.MB_CONFIG && window.MB_CONFIG.DEMO_CREDENTIALS && window.MB_CONFIG.DEMO_CREDENTIALS.admin)
  );
  if (!hasConfig) {
    warn(
      "ui.login.config_missing",
      "login.html no carga config.js — MB_CONFIG ausente (acceso rápido demo no funciona)"
    );
  } else {
    ok("ui.login.config", "MB_CONFIG presente");
  }
  if (!hasDemo) {
    warn("ui.login.demo_missing", "DEMO_CREDENTIALS.admin no disponible en login");
  }

  // Login físico admin
  consoleErrors.length = 0;
  pageErrors.length = 0;
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", ADMIN.password);
  await Promise.all([
    page.waitForURL(/dashboard-admin/, { timeout: 20000 }).catch(() => null),
    page.click("#btnLogin"),
  ]);

  const urlAfter = page.url();
  if (/dashboard-admin/.test(urlAfter)) {
    ok("ui.login.admin", urlAfter);
    await page.screenshot({ path: join(OUT_DIR, "01-dashboard-admin.png"), fullPage: true });
  } else {
    // ¿alert?
    fail("ui.login.admin", `URL actual: ${urlAfter}`);
    await page.screenshot({ path: join(OUT_DIR, "01-login-fail.png"), fullPage: true });
  }

  // Dashboard protegido sin sesión
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto(BASE + "/dashboard-rrhh.html", { waitUntil: "networkidle", timeout: 30000 });
  await page2.waitForTimeout(1500);
  if (/login/.test(page2.url())) {
    ok("ui.guard.redirect", "dashboard sin sesión → login");
  } else {
    fail("ui.guard.redirect", `esperaba login, quedó en ${page2.url()}`);
  }
  await ctx2.close();

  // Con sesión: pantallas clave
  if (/dashboard-admin/.test(page.url())) {
    const panels = [
      { name: "dashboard-rrhh", path: "/dashboard-rrhh.html" },
      { name: "dashboard-medico", path: "/dashboard-medico.html" },
      { name: "dashboard-jefe", path: "/dashboard-jefe.html" },
      { name: "dashboard-sgi", path: "/dashboard-sgi.html" },
      { name: "dashboard-seguridad", path: "/dashboard-seguridad.html" },
      { name: "cargar-puestos", path: "/cargar-puestos.html" },
      { name: "ayuda", path: "/ayuda.html" },
    ];

    // Inyectar sesión en storage ya viene del login
    for (const panel of panels) {
      consoleErrors.length = 0;
      pageErrors.length = 0;
      const resp = await page.goto(BASE + panel.path, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      await page.waitForTimeout(1200);
      const finalUrl = page.url();
      const status = resp?.status() || 0;
      const bodyText = await page.locator("body").innerText().catch(() => "");
      const bounced = /login\.html|\/login/.test(finalUrl);
      if (bounced) {
        fail(`ui.panel.${panel.name}`, "redirigió a login (sesión/RBAC)");
        continue;
      }
      if (status >= 400) {
        fail(`ui.panel.${panel.name}`, `HTTP ${status}`);
        continue;
      }
      // Señales de error visibles
      const hasFatal =
        /Error de autenticación|No se pudo|RPC .* →|TypeError|undefined is not|Failed to fetch/i.test(
          bodyText
        );
      if (hasFatal) {
        fail(`ui.panel.${panel.name}`, "texto de error visible en UI");
      } else {
        ok(`ui.panel.${panel.name}`, `cargó (${bodyText.slice(0, 40).replace(/\s+/g, " ")}…)`);
      }
      if (pageErrors.length) {
        warn(`ui.panel.${panel.name}.pageerror`, pageErrors.slice(0, 2).join(" | "));
      }
      await page.screenshot({
        path: join(OUT_DIR, `panel-${panel.name}.png`),
        fullPage: true,
      });
    }

    // Dashboard RRHH: menús / contratación
    await page.goto(BASE + "/dashboard-rrhh.html", { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    const contratacion = await page.locator("text=/Contrataci[oó]n/i").count();
    if (contratacion > 0) ok("ui.rrhh.menu_contratacion", "entrada Contratación visible");
    else warn("ui.rrhh.menu_contratacion", "no se encontró texto Contratación");

    const vacantes = await page.locator("text=/Vacante|Descripci[oó]n/i").count();
    if (vacantes > 0) ok("ui.rrhh.menu_vacantes", "sección vacantes/descripciones presente");
    else warn("ui.rrhh.menu_vacantes", "no se detectó menú vacantes");

    // Portal candidato público
    await page.goto(BASE + "/index.html", { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    const portalBrand = await page.locator("text=Ma Baker and Chef").count();
    if (portalBrand > 0) ok("ui.portal.brand", "marca en portal");
    else fail("ui.portal.brand", "marca ausente");

    const jobCards = await page.locator("[data-vacante], .vacante-card, .job-card, article").count();
    const jobButtons = await page.locator("button, a").filter({ hasText: /Postul|Aplicar|Seleccionar/i }).count();
    info("ui.portal.jobs_ui", `cards≈${jobCards}, CTAs≈${jobButtons}`);
    await page.screenshot({ path: join(OUT_DIR, "02-portal-candidato.png"), fullPage: true });

    // Check vacantes loaded via network or DOM
    const vacanteText = await page.evaluate(async () => {
      try {
        const CFG = window.MB_CONFIG || {};
        const r = await fetch(
          `${CFG.SUPABASE_URL}/rest/v1/catalogo_puestos?select=id,nombre_puesto,activo&activo=eq.true&limit=20`,
          {
            headers: {
              apikey: CFG.SUPABASE_ANON_KEY,
              Authorization: `Bearer ${CFG.SUPABASE_ANON_KEY}`,
            },
          }
        );
        const data = await r.json();
        return { status: r.status, count: Array.isArray(data) ? data.length : 0, sample: data?.[0]?.nombre_puesto };
      } catch (e) {
        return { error: String(e) };
      }
    });
    if (vacanteText.error) fail("ui.portal.vacantes_fetch", vacanteText.error);
    else if (vacanteText.count > 0)
      ok("ui.portal.vacantes_fetch", `${vacanteText.count} activas (ej. ${vacanteText.sample})`);
    else warn("ui.portal.vacantes_fetch", "0 vacantes activas — candidatos no pueden postular");

    // Runtime URLs
    const runtime = await page.evaluate(() => {
      const C = window.MB_CONFIG || {};
      return {
        email: C.EMAIL_WEBHOOK_URL || "",
        psycho: C.PSYCHOMETRIC_SETUP_WEBHOOK_URL || "",
        psychoPublic: C.PSYCHOMETRIC_PUBLIC_URL || "",
        upload: C.DOCUMENT_UPLOAD_WEBHOOK_URL || "",
        company: C.COMPANY_NAME || "",
      };
    });
    if (runtime.email) ok("ui.runtime.email_webhook", runtime.email);
    else fail("ui.runtime.email_webhook", "EMAIL_WEBHOOK_URL vacío — no hay correos");
    if (runtime.psycho) ok("ui.runtime.psycho_webhook", runtime.psycho);
    else warn("ui.runtime.psycho_webhook", "PSYCHOMETRIC_SETUP_WEBHOOK_URL vacío");
    if (/localhost/i.test(runtime.psychoPublic || "")) {
      warn(
        "ui.runtime.psycho_public_url",
        `apunta a localhost — no listo para producción: ${runtime.psychoPublic}`
      );
    } else if (runtime.psychoPublic) {
      ok("ui.runtime.psycho_public_url", runtime.psychoPublic);
    } else {
      warn("ui.runtime.psycho_public_url", "vacío");
    }
    if (runtime.company === "Ma Baker and Chef") ok("ui.runtime.company_name", runtime.company);
    else warn("ui.runtime.company_name", runtime.company || "(vacío)");
  }

  await browser.close();
}

function summarize() {
  const pass = RESULTS.filter((r) => r.status === "PASS").length;
  const fails = RESULTS.filter((r) => r.status === "FAIL");
  const warns = RESULTS.filter((r) => r.status === "WARN");
  console.log("\n=== RESUMEN ===");
  console.log(`PASS: ${pass} | FAIL: ${fails.length} | WARN: ${warns.length}`);
  if (fails.length) {
    console.log("\nBloqueantes:");
    for (const f of fails) console.log(`  - ${f.id}: ${f.detail}`);
  }
  if (warns.length) {
    console.log("\nAdvertencias:");
    for (const w of warns) console.log(`  - ${w.id}: ${w.detail}`);
  }

  // Veredicto
  let verdict = "LISTO_CON_RESERVAS";
  if (fails.length > 0) verdict = "NO_LISTO";
  else if (warns.some((w) => /psycho_public_url|vacantes|config_missing|email/i.test(w.id)))
    verdict = "LISTO_CON_RESERVAS";
  else if (warns.length === 0) verdict = "LISTO";

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    verdict,
    counts: { pass, fail: fails.length, warn: warns.length },
    results: RESULTS,
  };
  mkdirSync(OUT_DIR, { recursive: true });
  const outFile = join(OUT_DIR, "report.json");
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nVeredicto: ${verdict}`);
  console.log(`Reporte: ${outFile}`);
  console.log(`Screenshots: ${OUT_DIR}`);
  return report;
}

const token = await apiAudit();
await uiAudit(token);
const report = summarize();
process.exit(report.counts.fail > 0 ? 1 : 0);
