import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type TestResult = { name: string; passed: boolean; error?: string };

async function runTest(name: string, fn: () => Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { name, passed: true };
  } catch (e) {
    return { name, passed: false, error: String(e) };
  }
}

Deno.serve(async () => {
  const results: TestResult[] = [];
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Test 1: notify-candidate without correo (no candidate email attempt) ──────
  let notifResponse: { ok: boolean; results: string[]; notificaciones_ids: number[] } | null = null;

  results.push(await runTest('notify-candidate returns HTTP 200', async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/notify-candidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        nombre: 'Integration Test Runner',
        correo: null,
        puesto: 'Auxiliar de Almacen',
        veredicto: 'Apto para Entrevista',
        puntaje: 88,
        id: -99,
      }),
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    notifResponse = await res.json() as typeof notifResponse;
  }));

  results.push(await runTest('response ok=true', async () => {
    if (!notifResponse?.ok) throw new Error(`ok is not true: ${JSON.stringify(notifResponse)}`);
  }));

  results.push(await runTest('results array has 2 items', async () => {
    if (!Array.isArray(notifResponse?.results)) throw new Error('results is not an array');
    if (notifResponse!.results.length !== 2) throw new Error(`expected 2 results, got ${notifResponse!.results.length}`);
  }));

  results.push(await runTest('notificaciones_ids array has 2 items', async () => {
    if (!Array.isArray(notifResponse?.notificaciones_ids)) throw new Error('notificaciones_ids is not an array');
    if (notifResponse!.notificaciones_ids.length !== 2) throw new Error(`expected 2 ids, got ${notifResponse!.notificaciones_ids.length}`);
  }));

  results.push(await runTest('candidate result is skipped when correo is null', async () => {
    const r0 = notifResponse?.results[0] ?? '';
    if (r0 !== 'candidate_email_skipped') throw new Error(`expected candidate_email_skipped, got ${r0}`);
  }));

  // ── Test 2: verify DB rows ──────────────────────────────────────────────────
  const [id1, id2] = notifResponse?.notificaciones_ids ?? [0, 0];

  results.push(await runTest('candidato row has correct tipo and veredicto', async () => {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('id,tipo,veredicto,puntaje,enviado')
      .eq('id', id1)
      .single();
    if (error) throw new Error(error.message);
    if (data.tipo !== 'candidato') throw new Error(`tipo wrong: ${data.tipo}`);
    if (data.veredicto !== 'Apto para Entrevista') throw new Error(`veredicto wrong: ${data.veredicto}`);
    if (data.puntaje !== 88) throw new Error(`puntaje wrong: ${data.puntaje}`);
  }));

  results.push(await runTest('rrhh row has correct tipo and destinatario', async () => {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('id,tipo,destinatario,enviado')
      .eq('id', id2)
      .single();
    if (error) throw new Error(error.message);
    if (data.tipo !== 'rrhh') throw new Error(`tipo wrong: ${data.tipo}`);
    if (data.destinatario !== 'jesussaes@gmail.com') throw new Error(`destinatario wrong: ${data.destinatario}`);
  }));

  // ── Test 3: anon key can read notificaciones (RLS) ─────────────────────────
  results.push(await runTest('anon key can SELECT from notificaciones (RLS)', async () => {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await anonClient
      .from('notificaciones')
      .select('id')
      .eq('id', id1);
    if (error) throw new Error(error.message);
    if (!data || data.length !== 1) throw new Error(`expected 1 row, got ${data?.length ?? 0}`);
  }));

  // ── Test 4: email path executes when correo is provided ─────────────────────
  // This proves the Resend send attempt is made. With a valid RESEND_API_KEY the
  // result is candidate_email_sent; with an invalid key it is candidate_email_error_NNN.
  // Either way it must NOT be candidate_email_skipped or candidate_email_pending.
  let emailPathResponse: { ok: boolean; results: string[]; notificaciones_ids: number[] } | null = null;

  results.push(await runTest('email path: notify-candidate with correo returns HTTP 200', async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/notify-candidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        nombre: 'Email Path Test',
        correo: 'jesussaes@gmail.com',
        puesto: 'Auxiliar de Almacen',
        veredicto: 'Apto para Entrevista',
        puntaje: 75,
        id: -98,
      }),
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    emailPathResponse = await res.json() as typeof emailPathResponse;
  }));

  results.push(await runTest('email path: candidate result is _sent, _notification_logged, or _error_NNN (not _skipped/_pending)', async () => {
    const r0 = emailPathResponse?.results[0] ?? '';
    // _skipped means correo was ignored; _pending means email code was never reached.
    if (r0 === 'candidate_email_skipped' || r0 === 'candidate_email_pending') {
      throw new Error(`email path not exercised: result was ${r0}`);
    }
    // Accept: candidate_email_sent, candidate_notification_logged, candidate_email_error_NNN
    const valid = r0.startsWith('candidate_email_') || r0 === 'candidate_notification_logged';
    if (!valid) throw new Error(`unexpected result format: ${r0}`);
  }));

  results.push(await runTest('email path: rrhh result is _sent (not _pending/_error)', async () => {
    const r1 = emailPathResponse?.results[1] ?? '';
    if (r1 !== 'rrhh_email_sent') {
      throw new Error(`expected rrhh_email_sent, got: ${r1}`);
    }
  }));

  results.push(await runTest('email path: candidate result is _sent (not _pending/_error)', async () => {
    const r0 = emailPathResponse?.results[0] ?? '';
    if (r0 !== 'candidate_email_sent') {
      throw new Error(`expected candidate_email_sent, got: ${r0}`);
    }
  }));

  // Verify enviado=true in DB for the email-path rows
  const [epId1, epId2] = emailPathResponse?.notificaciones_ids ?? [0, 0];

  results.push(await runTest('email path: candidato row enviado=true in DB', async () => {
    const { data, error } = await supabase
      .from('notificaciones').select('enviado').eq('id', epId1).single();
    if (error) throw new Error(error.message);
    if (!data.enviado) throw new Error('candidato enviado is false — Resend rejected the email');
  }));

  results.push(await runTest('email path: rrhh row enviado=true in DB', async () => {
    const { data, error } = await supabase
      .from('notificaciones').select('enviado').eq('id', epId2).single();
    if (error) throw new Error(error.message);
    if (!data.enviado) throw new Error('rrhh enviado is false — Resend rejected the email');
  }));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const allPassed = failed === 0;

  return new Response(
    JSON.stringify({ ok: allPassed, passed, failed, total: results.length, results }),
    {
      status: allPassed ? 200 : 422,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    },
  );
});
