# Ma Baker & Chef — Sistema de Reclutamiento

Sistema interno de gestión de reclutamiento y selección de personal para **Ma Baker & Chef**.

---

## Arquitectura

```
ma-baker-recruitment/
├── app/                        # Frontend estático (HTML/CSS/JS vanilla)
│   ├── js/
│   │   ├── auth.js             # Autenticación y RBAC (roles)
│   │   ├── app.js              # Lógica principal del dashboard RRHH
│   │   └── dashboard.js        # Dashboard con tabla de candidatos
│   └── *.html                  # Dashboards por rol
├── nextjs-app/                 # App Next.js (evaluaciones médicas)
│   ├── src/app/                # Rutas y componentes
│   └── tests/e2e.spec.ts       # Tests Playwright E2E
├── supabase/
│   └── functions/
│       ├── notify-candidate/   # Edge Function: envío de notificaciones por email
│       └── run-integration-tests/ # Edge Function: suite de tests serverless
├── database/
│   └── crear-tablas.js         # Script de inicialización de base de datos
└── .github/workflows/
    ├── integration-test.yml    # CI: Playwright + integración real + tests serverless
    ├── deploy-gh-pages.yml     # Deploy del frontend estático a GitHub Pages
    └── deploy-vercel.yml       # Deploy de la app Next.js a Vercel
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Base de datos | Supabase (PostgreSQL + RLS) |
| Backend | Supabase Edge Functions (Deno) |
| Frontend estático | HTML/CSS/JS vanilla → GitHub Pages |
| Frontend dinámico | Next.js → Vercel |
| Envío de emails | Resend API |
| CI/CD | GitHub Actions |
| Tests E2E | Playwright (Chromium) |

---

## Roles del sistema

| Rol | Dashboard | Acceso |
|-----|-----------|--------|
| `admin` | dashboard-admin.html | Todos los dashboards |
| `rrhh` | dashboard-rrhh.html | RRHH + carga de puestos/psicométricos |
| `medico` | dashboard-medico.html | Solo evaluaciones médicas |
| `jefe` | dashboard-jefe.html | Solo su área |
| `sgi` | dashboard-sgi.html | Calidad e inocuidad |
| `seguridad` | dashboard-seguridad.html | Seguridad e Higiene |

---

## Edge Functions

### `notify-candidate`
Envía notificaciones por email al candidato y a RRHH al finalizar una evaluación.

**Endpoint:** `POST /functions/v1/notify-candidate`

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "correo": "juan@ejemplo.com",
  "puesto": "Auxiliar de Almacén",
  "veredicto": "Apto para Entrevista",
  "puntaje": 90,
  "id": 123
}
```

**Respuesta:**
```json
{
  "ok": true,
  "results": ["candidate_email_sent", "rrhh_email_sent"],
  "notificaciones_ids": [456, 457]
}
```

### `run-integration-tests`
Suite de 13 tests serverless que verifican el sistema end-to-end.

**Endpoint:** `GET /functions/v1/run-integration-tests`

---

## Variables de entorno y secretos

### GitHub Actions Secrets
| Secret | Descripción |
|--------|-------------|
| `SUPABASE_ANON_KEY` | Publishable key de Supabase (pública por diseño) |

### Supabase Edge Function Secrets
| Secret | Descripción |
|--------|-------------|
| `RESEND_API_KEY` | API key de Resend para envío de emails |
| `SERVICE_ROLE_KEY` | Secret key de Supabase (acceso admin a la BD) |
| `RRHH_EMAIL` | Email del área de RRHH para notificaciones |

> **Nota de seguridad:** Las claves secretas (`SERVICE_ROLE_KEY`, `RESEND_API_KEY`) se configuran
> directamente en Supabase → Edge Functions → Secrets. **Nunca se committean a git.**

### Vercel / GitHub Pages (Frontend)
| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key de Supabase |

---

## CI/CD Pipeline

```
push → claude/continue-hr-project-ou2m2
         │
         ├── [playwright] Next.js build + Playwright E2E (5 tests)
         │        └── requiere: SUPABASE_ANON_KEY (GitHub Secret)
         │
         ├── [notify-integration] Llama directamente a notify-candidate en Supabase
         │        └── verifica: HTTP 200, ok=true, 2 notificaciones, emails enviados
         │
         └── [serverless-integration] Llama a run-integration-tests (13 tests)
                  └── verifica: todos los tests pasan (ok=true)
```

---

## Línea del tiempo del proyecto

### Fase 1 — Infraestructura base
- Creación del repositorio `ma-baker-recruitment`
- Configuración de Supabase: tablas `candidatos`, `notificaciones`, `sesiones`, `usuarios`
- Implementación de RBAC con roles: admin, rrhh, medico, jefe, sgi, seguridad
- Dashboard RRHH con tabla de candidatos y evaluación de psicométricos
- Dashboard médico con formulario de evaluación (Next.js)

### Fase 2 — Sistema de notificaciones
- Edge Function `notify-candidate` v1: envío de emails via Resend
- Tabla `notificaciones` con columnas `tipo`, `destinatario`, `veredicto`, `puntaje`, `enviado`
- Integración con Resend API (dominio `onboarding@resend.dev`)

### Fase 3 — Tests y CI
- GitHub Actions workflow `integration-test.yml` con 3 jobs
- Edge Function `run-integration-tests`: suite de 13 tests serverless estrictos
- Tests Playwright E2E para el flujo médico (Next.js)
- CI #36: **primer CI completamente verde** con 13/13 tests estrictos ✅

### Fase 4 — Auditoría de seguridad (Oct 30-31, 2026)

**Problema detectado:** Credenciales hardcodeadas en el historial de git.

**Archivos afectados:**
- `app/js/dashboard.js` — contenía `service_role key` de Supabase
- `app/js/app.js` / `auth.js` — contenían `anon key` hardcodeada
- `database/crear-tablas.js` — contenía `service_role key`
- `nextjs-app/tests/e2e.spec.ts` — contenía `anon key` y contraseña de test
- `.github/workflows/integration-test.yml` — contenía `anon key` en texto plano

**Mitigación inmediata (usuario):**
- Deshabilitó las JWT Legacy API Keys en Supabase → claves expuestas quedaron invalidadas
- Generó nuevas API Keys con el sistema moderno (`sb_publishable_...` / `sb_secret_...`)

**Correcciones en código (commit `8952a7b`):**
- `dashboard.js`: service_role key → token de sesión de localStorage
- `app.js` / `auth.js`: anon key hardcodeada → `window.__SUPABASE_ANON_KEY__` (inyección runtime)
- `crear-tablas.js`: service_role key → `process.env.SUPABASE_SERVICE_ROLE_KEY`
- `e2e.spec.ts`: credenciales → variables de entorno (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `E2E_TEST_PASSWORD`)
- `integration-test.yml`: anon key en texto plano → `${{ secrets.SUPABASE_ANON_KEY }}`
- `vercel.json`: anon key hardcodeada → referencia `@NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Fix de nombre de secreto (commit `456f464`):**
- Supabase reserva el prefijo `SUPABASE_` para secretos de Edge Functions
- Edge functions actualizadas para leer `SERVICE_ROLE_KEY` (con fallback a `SUPABASE_SERVICE_ROLE_KEY`)

**Configuración de secrets (Oct 31, 2026):**
- GitHub Secret `SUPABASE_ANON_KEY` configurado con nueva publishable key
- Supabase Edge Function Secret `RESEND_API_KEY` actualizado con clave válida de Resend

**Estado al cierre de la auditoría:**
- ✅ Ninguna clave secreta en el repositorio git
- ✅ Claves legacy invalidadas por el usuario
- ✅ Sistema de inyección runtime para la anon key (no en código)
- ✅ Secrets de CI/CD en GitHub Actions Secrets (cifrados)
- ✅ Secrets del backend en Supabase Edge Function Secrets (cifrados)

---

## Cómo ejecutar localmente

### Frontend estático
```bash
# Abrir directamente en el navegador
open app/login.html
```

### App Next.js
```bash
cd nextjs-app
npm ci
NEXT_PUBLIC_SUPABASE_URL=https://znskpdixdyxdbvpapqrg.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable_key> \
npm run dev
```

### Tests Playwright
```bash
cd nextjs-app
npm ci
npx playwright install chromium
NEXT_PUBLIC_SUPABASE_URL=https://znskpdixdyxdbvpapqrg.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable_key> \
npx playwright test
```

### Tests serverless (sin runner local)
```bash
curl -s \
  -H "Authorization: Bearer <anon_key>" \
  https://znskpdixdyxdbvpapqrg.supabase.co/functions/v1/run-integration-tests \
  | python3 -m json.tool
```

---

## Seguridad

- **RLS (Row Level Security)** habilitado en todas las tablas principales
- **Autenticación por token** con función `fn_verificar_sesion` en PostgreSQL
- **RBAC** implementado en frontend (`ROLE_ACCESS` en `auth.js`)
- **Ninguna clave secreta en git** — todas las credenciales en Secrets cifrados
- **Anon key inyectada en runtime** via `window.__SUPABASE_ANON_KEY__` (no en código fuente)

---

*Última actualización: 31 de octubre de 2026*
