---
name: supabase-webhook-autopilot
description: >-
  Detecta y valida la URL activa de la Edge Function send-postulacion-emails en
  Supabase, actualiza runtime-config.js y prueba envío real de correo. Usar cuando
  el usuario pida activar correos, encontrar webhook real, probar envío, configurar
  EMAIL_WEBHOOK_URL, dejarlo automático, o falle postulación/correo por webhook
  incorrecto o función no desplegada.
---

# Supabase Webhook Autopilot

## Objetivo

Dejar operativo el flujo de correo de postulación sin pasos manuales repetitivos:

1. Detectar URL real de `send-postulacion-emails`.
2. Escribirla en `app/js/runtime-config.js`.
3. Probar envío real.
4. Reportar resultado.

## Flujo obligatorio

### 1. Validar prerequisitos

- Confirmar que existe `app/js/runtime-config.js`.
- Confirmar credenciales válidas para Supabase MCP (`SUPABASE_ACCESS_TOKEN`) o CLI enlazado.

### 2. Obtener URL real del webhook

- Usar MCP de Supabase para listar Edge Functions del proyecto.
- Buscar la función `send-postulacion-emails`.
- Construir URL: `https://<PROJECT_REF>.functions.supabase.co/send-postulacion-emails`.
- **Nunca inventar** PROJECT_REF ni URLs.

### 3. Actualizar runtime

- Escribir `EMAIL_WEBHOOK_URL` en `app/js/runtime-config.js`.
- Si el usuario pidió correo temporal, establecer `CANDIDATE_RESULT_EMAIL_OVERRIDE`.

### 4. Probar envío

POST mínimo con `to`, `subject`, `text`.

**Bash:**

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/send-postulacion-emails" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"prueba","text":"ok"}'
```

**PowerShell (preferir Node):**

```powershell
node -e "fetch('https://<PROJECT_REF>.functions.supabase.co/send-postulacion-emails',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:'test@example.com',subject:'prueba',text:'ok'})}).then(r=>r.json()).then(console.log)"
```

Verificar respuesta `ok: true` o equivalente.

### 5. Diagnóstico si falla

| Síntoma | Acción |
|---------|--------|
| 404 / función no listada | Redeploy Edge Function; verificar nombre exacto |
| `missing_*_credentials` / 500 credenciales | Seguir `~/.cursor/skills/supabase-edge-secrets-not-vault/` (`supabase secrets set`, no Vault SQL) |
| URL incorrecta en runtime | Re-ejecutar paso 2 desde MCP |
| Error Resend/SMTP | Revisar nombres de secrets vs `Deno.env.get` en el código |

### 6. Salida al usuario

Informar:

- URL activa usada.
- Resultado de prueba de envío.
- Siguiente paso mínimo si hubo error.

## Reglas de seguridad

- Nunca inventar URLs de Supabase.
- Nunca exponer tokens o secretos en texto.
- Si falta token/credencial, parar y pedir solo el dato faltante.

## Mensaje de confirmación sugerido

- `Webhook activo configurado en runtime-config.js`
- `Prueba de envío: exitosa a <correo>`
- o `Prueba fallida: <error exacto>`

## Cierre documental

Si hubo cambios de config o troubleshooting nuevo, aplicar skill `documentacion-cierre-ma-baker` antes de dar por cerrada la tarea.
