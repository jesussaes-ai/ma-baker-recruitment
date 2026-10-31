import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RRHH_EMAIL = Deno.env.get('RRHH_EMAIL') || 'jesussaes@gmail.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const FROM_ADDRESS = 'Ma Baker & Chef <onboarding@resend.dev>';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      },
    });
  }

  let body: { nombre?: string; correo?: string; puesto?: string; veredicto?: string; puntaje?: number; id?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const { nombre = '', correo, puesto = '', veredicto = '', puntaje = 0, id } = body;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const results: string[] = [];
  const notificacionesIds: number[] = [];

  // Log candidate notification row
  const { data: row1, error: e1 } = await supabase
    .from('notificaciones')
    .insert({
      candidato_id: id ?? null,
      tipo: 'candidato',
      destinatario: correo ?? 'sin_correo',
      veredicto,
      puntaje,
      enviado: false,
    })
    .select('id')
    .single();
  if (e1) {
    results.push(`candidate_log_error: ${e1.message}`);
  } else {
    notificacionesIds.push(row1.id);
    results.push(correo ? 'candidate_email_pending' : 'candidate_email_skipped');
  }

  // Log RRHH notification row
  const { data: row2, error: e2 } = await supabase
    .from('notificaciones')
    .insert({
      candidato_id: id ?? null,
      tipo: 'rrhh',
      destinatario: RRHH_EMAIL,
      veredicto,
      puntaje,
      enviado: false,
    })
    .select('id')
    .single();
  if (e2) {
    results.push(`rrhh_log_error: ${e2.message}`);
  } else {
    notificacionesIds.push(row2.id);
    results.push('rrhh_email_pending');
  }

  // Send emails if RESEND_API_KEY is configured
  if (RESEND_API_KEY) {
    if (correo) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: FROM_ADDRESS,
            to: [correo],
            subject: `Resultado de tu evaluación — ${puesto}`,
            html: `<p>Hola <strong>${nombre}</strong>,</p><p>Tu evaluación para el puesto <strong>${puesto}</strong> ha sido completada.</p><p>Resultado: <strong>${veredicto}</strong> (${puntaje}%)</p><p>Gracias por participar.</p>`,
          }),
        });
        if (emailRes.ok) {
          await supabase.from('notificaciones').update({ enviado: true }).eq('id', notificacionesIds[0]);
          results[0] = 'candidate_email_sent';
        } else if (emailRes.status === 401 || emailRes.status === 403) {
          // Invalid/revoked key — notification is logged to DB; email will send when key is valid
          results[0] = 'candidate_notification_logged';
        } else {
          results[0] = `candidate_email_error_${emailRes.status}`;
        }
      } catch {
        results[0] = 'candidate_notification_logged';
      }
    }

    try {
      const rrhhRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [RRHH_EMAIL],
          subject: `Nuevo candidato evaluado: ${nombre} — ${veredicto}`,
          html: `<p>Candidato: <strong>${nombre}</strong></p><p>Puesto: ${puesto}</p><p>Resultado: <strong>${veredicto}</strong> (${puntaje}%)</p><p>ID en base de datos: #${id}</p>`,
        }),
      });
      if (rrhhRes.ok) {
        await supabase.from('notificaciones').update({ enviado: true }).eq('id', notificacionesIds[1]);
        results[results.length - 1] = 'rrhh_email_sent';
      } else if (rrhhRes.status === 401 || rrhhRes.status === 403) {
        // Invalid/revoked key — notification is logged to DB
        results[results.length - 1] = 'rrhh_notification_logged';
      } else {
        results[results.length - 1] = `rrhh_email_error_${rrhhRes.status}`;
      }
    } catch {
      results[results.length - 1] = 'rrhh_notification_logged';
    }
  } else {
    // No API key — notification logged to DB only
    results[0] = results[0].replace('_pending', '_notification_logged').replace('_skipped', '_email_skipped');
    if (results.length > 1) {
      results[results.length - 1] = results[results.length - 1].replace('_pending', '_notification_logged');
    }
  }

  return new Response(
    JSON.stringify({ ok: true, results, notificaciones_ids: notificacionesIds }),
    { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
  );
});
