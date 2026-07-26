/**
 * Pruebas UI profundas post-login: KPIs, paneles, Historial Rechazos, privacidad portal
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:8080";
const OUT = join(__dirname, "..", "tmp", "audit-readiness");
mkdirSync(OUT, { recursive: true });

const ADMIN = { email: "admin@mabakerandchef.com", password: "010967" };
const findings = [];

function log(status, id, detail) {
  findings.push({ status, id, detail });
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
  console.log(`${icon} ${status} ${id} — ${detail}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto(BASE + "/login.html", { waitUntil: "networkidle" });
await page.fill("#email", ADMIN.email);
await page.fill("#password", ADMIN.password);
await Promise.all([
  page.waitForURL(/dashboard-admin/, { timeout: 20000 }),
  page.click("#btnLogin"),
]);
log("PASS", "login", page.url());

// Esperar KPIs
await page.waitForTimeout(4000);
const kpiText = await page.locator("body").innerText();
const kpiDashes = (kpiText.match(/--/g) || []).length;
const stillLoading = /Cargando\.\.\./i.test(kpiText);
const kpiNumbers = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("[data-kpi], .kpi, .stat-card, .metric")];
  // fallback: buscar números grandes en header stats
  const all = document.body.innerText;
  return {
    stillLoading: /Cargando/i.test(all),
    hasZeroCandidates: /CANDIDATOS TOTALES[\s\S]{0,40}0\b/i.test(all) || /CANDIDATOS TOTALES[\s\S]{0,40}--/i.test(all),
    snippet: all.match(/CANDIDATOS TOTALES[\s\S]{0,80}/i)?.[0] || "",
    vacantesSnippet: all.match(/VACANTES ACTIVAS[\s\S]{0,80}/i)?.[0] || "",
    filtroSnippet: all.match(/FILTRO IA[\s\S]{0,80}/i)?.[0] || "",
  };
});
await page.screenshot({ path: join(OUT, "03-admin-after-wait.png"), fullPage: true });

if (stillLoading || kpiNumbers.stillLoading) {
  log("FAIL", "ui.kpis.loading", "sigue en Cargando... tras 4s");
} else {
  log("PASS", "ui.kpis.loaded", "dejó de cargar");
}
log("INFO", "ui.kpis.candidatos", kpiNumbers.snippet.replace(/\s+/g, " "));
log("INFO", "ui.kpis.vacantes", kpiNumbers.vacantesSnippet.replace(/\s+/g, " "));
log("INFO", "ui.kpis.filtro", kpiNumbers.filtroSnippet.replace(/\s+/g, " "));

// Abrir Historial Rechazos
const histBtn = page.locator("text=/Historial Rechazos/i").first();
if (await histBtn.count()) {
  await histBtn.click();
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  await page.screenshot({ path: join(OUT, "04-historial-rechazos.png"), fullPage: true });
  if (/sesion_token|column .* does not exist|Error|No se pudo|42703/i.test(body)) {
    log("FAIL", "ui.historial_rechazos", "error visible (RPC sesion_token)");
  } else if (/sin rechazos|0 rechaz|vacío|no hay/i.test(body)) {
    log("PASS", "ui.historial_rechazos", "panel abrió sin error SQL (lista vacía o con datos)");
  } else {
    log("WARN", "ui.historial_rechazos", "panel abierto; revisar contenido: " + body.slice(0, 120).replace(/\s+/g, " "));
  }
} else {
  log("FAIL", "ui.historial_rechazos", "botón no encontrado");
}

// Contratación
const contBtn = page.locator("text=/Contrataci[oó]n/i").first();
if (await contBtn.count()) {
  await contBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, "05-contratacion.png"), fullPage: true });
  const body = await page.locator("body").innerText();
  if (/error|RPC|failed/i.test(body) && /contrat/i.test(body)) {
    log("WARN", "ui.contratacion", "posible error: " + body.match(/.{0,40}(error|RPC).{0,40}/i)?.[0]);
  } else {
    log("PASS", "ui.contratacion", "panel abrió");
  }
}

// Candidatos Activos
const candBtn = page.locator("text=/Candidatos Activos/i").first();
if (await candBtn.count()) {
  await candBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, "06-candidatos.png"), fullPage: true });
  log("PASS", "ui.candidatos_activos", "panel abrió");
}

// Logs
const logsBtn = page.locator("text=/Logs del Sistema/i").first();
if (await logsBtn.count()) {
  await logsBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, "07-logs.png"), fullPage: true });
  const body = await page.locator("body").innerText();
  if (/sesion_invalida|Error|42703/i.test(body) && /log/i.test(body)) {
    log("FAIL", "ui.logs", "error en logs");
  } else {
    log("PASS", "ui.logs", "panel logs abrió");
  }
}

// Descripciones
const descBtn = page.locator("text=/Descripciones de Puesto/i").first();
if (await descBtn.count()) {
  await descBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, "08-descripciones.png"), fullPage: true });
  const body = await page.locator("body").innerText();
  const hasRows = /ANALISTA|AUXILIAR|AYUDANTE|Puesto|código/i.test(body);
  if (hasRows) log("PASS", "ui.descripciones", "listado con puestos");
  else log("WARN", "ui.descripciones", "sin filas visibles");
}

// Publicar vacantes
const pubBtn = page.locator("text=/Publicar Vacantes/i").first();
if (await pubBtn.count()) {
  await pubBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, "09-publicar.png"), fullPage: true });
  log("PASS", "ui.publicar", "panel abrió");
}

// Portal: aceptar privacidad
await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const privacy = page.locator("#privacyAccept, input[type=checkbox]").first();
if (await privacy.count()) {
  await privacy.check({ force: true }).catch(async () => {
    await page.locator("label").filter({ hasText: /acepto/i }).click();
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, "10-portal-privacy.png"), fullPage: true });
  const body = await page.locator("body").innerText();
  if (/SIN VACANTES ACTIVAS|EJEMPLOS TEMPORALES/i.test(body)) {
    log("WARN", "ui.portal.after_privacy", "sigue sin vacantes activas / ejemplos temporales");
  } else if (/Postul|Aplicar|Seleccionar/i.test(body)) {
    log("PASS", "ui.portal.after_privacy", "listado de vacantes habilitado");
  } else {
    log("WARN", "ui.portal.after_privacy", body.slice(0, 150).replace(/\s+/g, " "));
  }
}

// Login RRHH físico
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "/login.html", { waitUntil: "networkidle" });
await page.fill("#email", "rrhh@mabakerandchef.com");
await page.fill("#password", "RRHH2026!");
await Promise.all([
  page.waitForURL(/dashboard-rrhh/, { timeout: 20000 }).catch(() => null),
  page.click("#btnLogin"),
]);
if (/dashboard-rrhh/.test(page.url())) log("PASS", "ui.login.rrhh", page.url());
else log("FAIL", "ui.login.rrhh", page.url());

await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "/login.html", { waitUntil: "networkidle" });
await page.fill("#email", "medico@mabakerandchef.com");
await page.fill("#password", "Medico2026!");
await Promise.all([
  page.waitForURL(/dashboard-medico/, { timeout: 20000 }).catch(() => null),
  page.click("#btnLogin"),
]);
if (/dashboard-medico/.test(page.url())) log("PASS", "ui.login.medico", page.url());
else log("FAIL", "ui.login.medico", page.url());

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  findings,
  fail: findings.filter((f) => f.status === "FAIL").length,
  warn: findings.filter((f) => f.status === "WARN").length,
  pass: findings.filter((f) => f.status === "PASS").length,
};
writeFileSync(join(OUT, "deep-ui-report.json"), JSON.stringify(report, null, 2));
console.log("\nDeep UI:", report.pass, "pass,", report.fail, "fail,", report.warn, "warn");
process.exit(report.fail > 0 ? 1 : 0);
