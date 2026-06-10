---
name: supabase-webhook-autopilot
description: Detecta y valida la URL activa de la Edge Function send-postulacion-emails en Supabase, actualiza runtime-config.js y prueba envio real de correo. Usar cuando el usuario pida "activar correos", "encontrar webhook real", "probar envío", "configurar EMAIL_WEBHOOK_URL" o "dejarlo automatico".
disable-model-invocation: true
---

# Supabase Webhook Autopilot

## Objetivo
Dejar operativo el flujo de correo de postulación sin pasos manuales repetitivos:
1) detectar URL real de `send-postulacion-emails`,
2) escribirla en `app/js/runtime-config.js`,
3) probar envío real,
4) reportar resultado.

## Flujo obligatorio

1. **Validar prerequisitos**
   - Confirmar que existe `app/js/runtime-config.js`.
   - Confirmar que hay credenciales válidas para Supabase MCP (`SUPABASE_ACCESS_TOKEN`).

2. **Obtener URL real del webhook**
   - Usar MCP de Supabase para listar Edge Functions del proyecto.
   - Buscar la función `send-postulacion-emails`.
   - Construir URL: `https://<PROJECT_REF>.functions.supabase.co/send-postulacion-emails`.

3. **Actualizar runtime**
   - Escribir `EMAIL_WEBHOOK_URL` en `app/js/runtime-config.js`.
   - Si el usuario pidió correo temporal, establecer `CANDIDATE_RESULT_EMAIL_OVERRIDE`.

4. **Probar envío**
   - Enviar un POST de prueba al webhook con `to`, `subject`, `text`.
   - Verificar respuesta `ok: true`.
   - Si falla: reportar error exacto y causa probable (función no desplegada, clave Resend faltante, URL incorrecta).

5. **Salida al usuario**
   - Informar:
     - URL activa usada,
     - resultado de prueba de envío,
     - siguiente paso mínimo si hubo error.

## Reglas de seguridad
- Nunca inventar URLs de Supabase.
- Nunca exponer tokens o secretos en texto.
- Si falta token/credencial, parar y pedir solo el dato faltante.

## Mensaje de confirmación sugerido
- `Webhook activo configurado en runtime-config.js`
- `Prueba de envío: exitosa a <correo>`
- o `Prueba fallida: <error exacto>`
