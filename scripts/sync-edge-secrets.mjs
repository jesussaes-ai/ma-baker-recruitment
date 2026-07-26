/**
 * Sincroniza secretos de vault.decrypted_secrets → Edge Functions (project secrets).
 * Uso: SUPABASE_PAT=... SUPABASE_PROJECT_REF=znskpdixdyxdbvpapqrg node scripts/sync-edge-secrets.mjs
 */
const REF = process.env.SUPABASE_PROJECT_REF || "znskpdixdyxdbvpapqrg";
const PAT = process.env.SUPABASE_PAT || "";
const NAMES = [
  "RESEND_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "GMAIL_SENDER_EMAIL",
  "MAIL_FROM",
  "EMAIL_PROVIDER_PRIORITY",
];

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`SQL HTTP ${r.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function setSecrets(entries) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/secrets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify(entries),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Secrets HTTP ${r.status}: ${text.slice(0, 300)}`);
  return text;
}

async function main() {
  if (!PAT) {
    console.error("Falta SUPABASE_PAT");
    process.exit(1);
  }

  const inList = NAMES.map((n) => `'${n}'`).join(", ");
  const rows = await sql(
    `SELECT name, decrypted_secret AS value FROM vault.decrypted_secrets WHERE name IN (${inList})`,
  );

  const map = new Map((rows || []).map((r) => [r.name, r.value]));
  const entries = [];

  for (const name of NAMES) {
    const value = map.get(name);
    if (value) entries.push({ name, value: String(value) });
  }

  // Resend primero: Gmail refresh token expirado
  entries.push({ name: "EMAIL_PROVIDER_PRIORITY", value: "resend,gmail,postmark,brevo" });

  await setSecrets(entries);
  console.log(`✅ ${entries.length} secretos sincronizados a Edge Functions`);

  const SUPA = `https://${REF}.supabase.co`;
  const anon = process.env.SUPABASE_ANON_KEY || "";
  const probe = await fetch(`${SUPA}/functions/v1/send-postulacion-emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
    body: JSON.stringify({
      to: "jesussaes@gmail.com",
      subject: "Prueba RRHH post-sync Resend",
      text: "Correo de verificación tras sync de secretos.",
    }),
  });
  const body = await probe.text();
  console.log(probe.ok ? "✅" : "❌", `Correo probe HTTP ${probe.status}:`, body.slice(0, 180));
  process.exit(probe.ok ? 0 : 1);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
