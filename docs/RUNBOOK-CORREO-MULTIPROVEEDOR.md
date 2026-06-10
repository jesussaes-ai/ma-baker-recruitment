# Runbook de Correo Multiproveedor

## Objetivo

Garantizar envio de correos de postulacion aun cuando un proveedor externo presente incidentes, usando failover automatico en la Edge Function `send-postulacion-emails`.

## Alcance

- Frontend: `app/js/app.js`
- Runtime config: `app/js/runtime-config.js`
- Edge Function: `supabase/functions/send-postulacion-emails/index.ts`
- Proyecto Supabase: `znskpdixdyxdbvpapqrg` (RRHH)

## Arquitectura actual de envio

La funcion de correo usa prioridad configurable y failover:

1. `gmail`
2. `resend`
3. `postmark`
4. `brevo`

Orden configurable via `EMAIL_PROVIDER_PRIORITY`.

Si un proveedor falla, intenta automaticamente el siguiente.

## Variables de entorno requeridas

### Comunes

- `MAIL_FROM` (ejemplo: `Ma Baker and Chef <jesussaes@gmail.com>`)
- `EMAIL_PROVIDER_PRIORITY` (ejemplo: `gmail,resend,postmark,brevo`)

### Gmail API (OAuth2)

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GMAIL_SENDER_EMAIL`

### Resend

- `RESEND_API_KEY`

### Postmark

- `POSTMARK_SERVER_TOKEN`

### Brevo

- `BREVO_API_KEY`

## Flujo funcional esperado

1. Candidato termina postulacion en frontend.
2. `submitForm()` guarda datos en Supabase.
3. `sendSubmissionEmails()` invoca `EMAIL_WEBHOOK_URL`.
4. Edge Function envia por proveedor disponible segun prioridad.
5. Al aceptar en modal final, la app sale (no recarga al inicio).

## Validacion operativa (checklist)

- [ ] `EMAIL_WEBHOOK_URL` apunta a `https://<PROJECT_REF>.functions.supabase.co/send-postulacion-emails`
- [ ] Existe al menos un proveedor con credenciales completas
- [ ] `MAIL_FROM` coincide con remitente permitido por el proveedor
- [ ] Se recibe `POST 200` en logs de Edge Functions
- [ ] El payload incluye `provider` y `attempts` en respuesta

## Prueba manual recomendada

1. Abrir portal candidato.
2. Completar entrevista hasta `Finalizar aplicacion`.
3. Esperar 3-5 segundos.
4. Confirmar modal de exito y salir.
5. Revisar logs Edge Function:
   - Exito: `status_code=200`
   - Error proveedor: `status_code=502`
   - Configuracion faltante: `status_code=500`

## Troubleshooting rapido

### 1) Resend responde "Temporalmente no disponible"

No es error del proyecto. Mantener operacion con Gmail/Postmark/Brevo.

### 2) Google OAuth `invalid_client` (401)

- Client ID incorrecto, truncado o de otro proyecto.
- Recrear OAuth Client y copiar de nuevo.

### 3) Google OAuth `redirect_uri_mismatch` (400)

En cliente OAuth tipo Web:

- Authorized JavaScript origin: `https://developers.google.com`
- Authorized redirect URI: `https://developers.google.com/oauthplayground`

### 4) Pantalla "Google no verifico esta app"

Esperado en modo Testing. Continuar por:

- `Configuracion avanzada`
- `Ir a <nombre-app> (no seguro)`

### 5) OAuth Playground no devuelve refresh token

- Revocar permisos de app en `myaccount.google.com/permissions`
- Repetir autorizacion con `prompt=consent` y `access_type=offline`

### 6) `POST /rest/v1/prospectos_rechazados` con 400 o 401

Si la postulación no se guarda, nunca se dispara el correo. Revisar:

- Mapeo de columnas del payload vs columnas reales de la tabla.
- Politicas RLS para `INSERT` en:
  - `prospectos_rechazados`
  - `candidatos_activos`
  - `log_agente`
- Confirmar permisos para roles `anon` y `authenticated` segun flujo activo.

### 7) 401 con "new row violates row-level security policy" aunque exista politica INSERT

Causa real encontrada (jun-2026): el frontend insertaba con header `Prefer: return=representation`.
Con RLS, devolver la fila insertada exige tambien una politica `SELECT` para el rol (`anon`),
que no existe por seguridad (las tablas contienen datos personales de candidatos).

Solucion aplicada (sin exponer datos):

- El frontend inserta con `Prefer: return=minimal` (no pide la fila de vuelta).
- El `id` del candidato se genera en el cliente con `crypto.randomUUID()` y se incluye en el INSERT,
  asi el flujo de correos y carga de documentos conserva el `candidato_id` sin necesitar SELECT.
- NO agregar politica SELECT para `anon` en estas tablas: expondria PII publicamente.

### 8) Edge Function responde 500 `missing_email_provider_credentials` aunque existan secretos en Vault

Causa: los secretos guardados en `vault.secrets` (SQL) **no** alimentan automaticamente las Edge Functions.
Las funciones leen `Deno.env.get(...)` desde **Secrets del proyecto Supabase** (CLI/Dashboard).

Solucion:

```bash
npx supabase secrets set --project-ref <PROJECT_REF> \
  GOOGLE_CLIENT_ID="..." \
  GOOGLE_CLIENT_SECRET="..." \
  GOOGLE_REFRESH_TOKEN="..." \
  GMAIL_SENDER_EMAIL="..." \
  MAIL_FROM="Ma Baker and Chef <remitente@gmail.com>" \
  EMAIL_PROVIDER_PRIORITY="gmail,resend,postmark,brevo"
```

Validacion rapida:

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/send-postulacion-emails" \
  -H "Content-Type: application/json" \
  -d '{"to":"tu-correo@gmail.com","subject":"prueba","text":"ok"}'
```

Esperado: HTTP 200 con `"ok":true,"provider":"gmail"`.

## Seguridad y rotacion de secretos

Debes rotar secretos si fueron compartidos en chats, capturas o canales no seguros:

1. Regenerar `GOOGLE_CLIENT_SECRET`.
2. Revocar y regenerar `GOOGLE_REFRESH_TOKEN`.
3. Actualizar secretos en Supabase Vault.
4. Probar envio nuevamente.

Nunca usar usuario/contrasena de Gmail como sustituto de OAuth2.

## Comandos utiles

Deploy de funcion:

```bash
supabase functions deploy send-postulacion-emails
```

Prueba HTTP basica:

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/send-postulacion-emails" \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"tu-correo@dominio.com\",\"subject\":\"Prueba\",\"text\":\"Correo de prueba\"}"
```

## Criterio de cierre

Se considera resuelto cuando:

- se observa `POST 200` en logs de la funcion,
- llega correo al candidato,
- llega correo a reclutador,
- y el flujo final de UI no regresa al inicio al cerrar.

