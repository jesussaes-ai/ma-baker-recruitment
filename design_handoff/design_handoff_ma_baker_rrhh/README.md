# Handoff: Ma Baker & Chef — Sistema de Reclutamiento RRHH Automatizado

## Overview
Sistema cloud para automatizar el proceso de reclutamiento y selección de personal de Ma Baker and Chef (panadería/industria alimentaria). El candidato completa un formulario auto-guiado en su teléfono que incluye perfil, carga de documentos, evaluación psicométrica y técnica. El sistema calcula un puntaje, emite un veredicto automático y guarda todo en Supabase. RRHH consulta resultados en un dashboard.

## About the Design Files
Los archivos HTML en este bundle son **referencias de diseño** — prototipos en HTML/React inline que muestran la apariencia, el flujo y el comportamiento deseado, **no código de producción para copiar tal cual**. La tarea es **recrear estos diseños en el entorno del codebase destino** (Next.js, React Native, Vue, Flutter, etc.) usando los patrones, librerías y design system establecidos en ese codebase. Si no existe codebase aún, elegir el framework más apropiado (sugerencia: **Next.js + Supabase + Tailwind** o **React Native + Expo + Supabase** si el candidato debe llenarlo en móvil).

## Fidelity
**Alta fidelidad (hifi).** Los mockups tienen colores, tipografía, espaciado y comportamiento finales. Recrear pixel-perfect usando el design system del codebase.

---

## Stack Backend (ya implementado parcialmente)

- **Supabase** (PostgreSQL + Auth + Storage)
- **Tabla:** `candidatos` (aunque el código actual la referencia como `Formulario de Candidatos` — **unificar el nombre durante la migración**)
- **Storage bucket:** `documentos` (público o privado con signed URLs)

### Schema SQL real

```sql
CREATE TABLE IF NOT EXISTS candidatos (
  id                         BIGSERIAL PRIMARY KEY,
  nombre                     TEXT,
  edad                       INTEGER,
  estatura                   NUMERIC,
  peso                       NUMERIC,
  genero                     TEXT,
  puesto_aplicado            TEXT,
  documentos                 JSONB DEFAULT '{}',
  requisitos_salud           JSONB DEFAULT '[]',
  respuestas_psicometricas   JSONB DEFAULT '{}',
  respuestas_tecnicas        JSONB DEFAULT '{}',
  puntaje_evaluacion_tecnica INTEGER,
  veredicto_final            TEXT,
  timestamp                  TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON candidatos FOR ALL USING (true) WITH CHECK (true);
```

> **Nota de seguridad:** la policy `allow_all` permite INSERT/SELECT desde el rol `anon`. En producción, separar políticas: `anon` solo INSERT (para que candidatos envíen), `authenticated` (RRHH) para SELECT/UPDATE/DELETE.

---

## Flujo de la aplicación

```
welcome → roleSelect → profile → documents → psych → technical → finalReport → (save) → success
```

### Vistas (App candidato)

#### 1. `welcome`
- Gradiente diagonal de marca: `linear-gradient(135deg, #D7282F 0%, #0071BC 100%)`
- Logo `chef-logo.jpg` centrado, 280px
- Título: "Sistema Cloud de Reclutamiento v4.1"
- Botón blanco "Iniciar Evaluación →"

#### 2. `roleSelect`
Dos cards seleccionables:
- **📦 Auxiliar de Almacén** — Edad 25-40, esfuerzo físico alto
- **🧪 Mezclador de Formulaciones** — Edad 22-50, precisión + 25kg ocasional

Card activa: fondo `#D7282F`, blanco. Inactiva: blanco con borde `#E0E0E0`.

#### 3. `profile`
Formulario:
- Nombre completo (requerido)
- Edad (validada contra rango del puesto — warning si fuera de rango)
- Estatura (cm), Peso (kg), Género (M/F)
- **TODOS los inputs en mayúsculas forzadas** vía `text-transform: uppercase !important`

#### 4. `documents`
Carga de 5 documentos a Supabase Storage bucket `documentos`:
1. INE / Identificación
2. Comprobante de domicilio
3. CURP
4. Acta de nacimiento
5. Comprobante de estudios

- Soporta: JPG, PNG, WEBP, PDF (max 10MB)
- En móvil: `<input type="file" accept="image/*" capture="environment">` para escanear con cámara
- Si Supabase Storage falla (iframe preview), guarda como base64 local con flag `localOnly: true`
- Preview modal al click en thumbnail subido

Path en Storage: `candidatos/{nombre}_{docId}_{timestamp}.{ext}`

#### 5. `psych` (Evaluación Psicométrica)
- ~10 preguntas con timer de 90 segundos cada una
- Opciones A/B/C/D radiobuttons
- Cada pregunta tiene respuesta "correcta" para puntuar

#### 6. `technical` (Evaluación Técnica)
- 10 preguntas específicas del puesto (`TECHNICAL_QUESTIONS.almacen` o `.mezclador`)
- Al terminar muestra resultados con score:
  - **≥70%** → "Apto para Entrevista" (verde)
  - **50-69%** → "Evaluación Adicional" (amarillo)
  - **<50%** → "No cumple perfil" (rojo)

#### 7. `finalReport`
Reporte completo en una sola pantalla:
- Perfil del candidato
- Veredicto + puntaje
- Resumen: documentos cargados, técnicas respondidas, psicométricas respondidas
- Documentos cargados con thumbnails clickeables
- Requisitos de salud (✓/✗)
- Respuestas técnicas con marca de acierto/error y respuesta correcta cuando se falla
- Botón: "✅ Guardar en Supabase" → llama `saveCandidateToSupabase()`

#### 8. `success`
Pantalla post-guardado:
- Emoji grande (🎉 / 📋 / ✅ según veredicto)
- Tarjeta con puntaje, veredicto, ID del registro Supabase
- Mensaje contextual:
  - Apto: "RRHH te contactará en 48h para entrevista"
  - Revisión: "Pasará a revisión manual"
  - No apto: "Hemos registrado tu información"
- CTA: "Nueva Evaluación" / "Volver al Reporte" / link al Dashboard

### Vistas (Dashboard RH)
Ver `Ma Baker Dashboard RH.html`. Lista todos los registros de `candidatos`, filtros por puesto/veredicto, click para ver detalle completo.

---

## Lógica clave a preservar

### Guardado en Supabase (`saveCandidateToSupabase`)
1. Limpia documentos local-only (no enviar base64 a DB)
2. Aplana `reportJSON` al esquema flat de la tabla (no enviar objetos anidados `candidato`, etc.)
3. Intenta INSERT con payload completo
4. Si falla por columna inexistente, retry con payload mínimo (solo `nombre`, `edad`, `puesto_aplicado`, `puntaje`, `veredicto`, `timestamp`)
5. Distingue errores de red en iframe vs errores reales de Supabase
6. Success → navega a vista `success`

### Subida a Storage (`uploadToSupabase`)
1. `supabase.storage.from('documentos').upload(path, file, { upsert: true })`
2. Obtiene publicUrl
3. Fallback a base64 local si está en iframe con `Failed to fetch`

### Cálculo de score técnico
```js
const correctCount = Object.values(techResponses)
  .filter((ans, idx) => ans === questions[idx]?.correct).length;
const score = Math.round((correctCount / questions.length) * 100);
```

### Error Boundary
React Error Boundary envuelve toda la app — nunca se debe mostrar pantalla en blanco. Si crashea, mostrar mensaje + botón "Recargar Aplicación".

---

## Design Tokens

### Colores
| Token | Hex | Uso |
|---|---|---|
| `--primary` | `#D7282F` | Marca principal (rojo Ma Baker), botones primarios, headers |
| `--secondary` | `#0071BC` | Azul institucional, botones secundarios, links |
| `--bg-light` | `#FFFFFF` | Fondo cards |
| `--bg-gray` | `#F5F5F5` | Fondo página, contenedores secundarios |
| `--text-dark` | `#1A1A1A` | Texto principal |
| `--text-light` | `#666666` | Texto secundario, labels |
| `--border` | `#E0E0E0` | Bordes inputs y cards |
| `--success` | `#4CAF50` | Verde — apto, éxitos |
| `--warning` | `#FFC107` | Amarillo — revisión, avisos |
| `--danger` | `#D32F2F` | Rojo error — no apto, errores críticos |

### Tipografía
- **Font:** Montserrat (Google Fonts), pesos 400/500/600/700
- **H1:** 28-32px / 700
- **H2:** 20-24px / 700
- **H3:** 15-18px / 700
- **Body:** 13-14px / 400
- **Small/label:** 11-12px / 600

### Espaciado
- Padding cards: `40px` (desktop), `20px` (móvil)
- Border radius: `8px` inputs, `12px` cards, `16px` cards principales
- Gap grid: `10-16px` interno, `24-32px` entre secciones

### Sombras
- Card hover: `0 8px 32px rgba(0,0,0,0.1)`
- Modal: `0 20px 60px rgba(0,0,0,0.3)`
- Success card: `0 12px 48px rgba(0,0,0,0.08)`

### Animaciones
```css
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
```

---

## Assets

- `chef-logo.jpg` — Logo de Ma Baker and Chef (incluido en el bundle)
- Emojis nativos para iconografía (no usar SVGs custom — la app actual usa solo emoji)

---

## Pendientes / Próximos pasos sugeridos

Funcionalidades que **no están implementadas** y deberían añadirse en producción:

1. **Notificaciones**: enviar email/WhatsApp al candidato al guardar (Twilio, Resend, Supabase Edge Functions)
2. **Autenticación RRHH**: el dashboard actual es público — agregar login (Supabase Auth con email/password o magic link)
3. **Calendario de entrevistas**: agendar slots para candidatos aptos (integración Google Calendar / Cal.com)
4. **Firma de contratos**: flujo de onboarding tras aceptación (DocuSign, HelloSign)
5. **Analytics**: métricas en dashboard (tasa de conversión por puesto, tiempo promedio del proceso, distribución de scores)
6. **Multi-idioma**: actualmente sólo español
7. **Versionado de cuestionarios**: las preguntas viven en el código — migrar a tabla `preguntas` para que RRHH las edite sin redeploy
8. **Anti-fraude básico**: detección de respuestas demasiado rápidas, tiempos por pregunta, IP/fingerprint
9. **Política RLS más estricta**: separar `anon` (INSERT) vs `authenticated` (SELECT/UPDATE) para que candidatos no puedan leer otros registros
10. **Tests**: el proyecto incluye `Ma Baker - Suite de Pruebas.html` como referencia de qué casos cubrir

---

## Files en este bundle

| Archivo | Descripción |
|---|---|
| `screenshots/` | Capturas de cada vista (ver `screenshots/README.md`) |
| `Ma Baker Sistema v4.1 - Supabase Integrado.html` | App principal del candidato (todas las 8 vistas) |
| `Ma Baker Dashboard RH.html` | Dashboard para RRHH |
| `Ma Baker - Hub Central.html` | Página índice con links a todas las secciones |
| `Ma Baker - Manual de Usuario.html` | Manual de usuario final |
| `Ma Baker Setup Supabase.html` | Wizard de setup inicial Supabase |
| `Ma Baker Guia Supabase.html` | Guía paso a paso para configurar Supabase |
| `Ma Baker Reload Schema.html` | Helper para refrescar schema cache de Supabase |
| `Ma Baker Fix Storage.html` | Helper para configurar bucket Storage |
| `Ma Baker SQL Final.html` | SQL final consolidado |
| `Ma Baker - Evaluacion Medica.html` | Subflujo de evaluación médica (vista RRHH) |
| `Ma Baker - Panel de Salud.html` | Panel de salud del sistema |
| `Ma Baker - Backups.html` | Sistema de backups manual |
| `Ma Baker - Suite de Pruebas.html` | Suite de QA |
| `Ma Baker - Arquitectura Tecnica.html` | Documentación de arquitectura |
| `chef-logo.jpg` | Logo de marca |
| `ma-baker-logger.js`, `ma-baker-validators.js`, `med-eval-*.js/jsx` | Helpers JS reutilizables |

## Cómo arrancar (Claude Code)

```bash
# Asumiendo Next.js + Supabase
npx create-next-app@latest ma-baker-rrhh --typescript --tailwind --app
cd ma-baker-rrhh
npm install @supabase/supabase-js

# Configurar .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xdtxfpvxoxqaadgyvzap.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>

# Crear estructura
mkdir -p app/(candidate)/{welcome,role,profile,documents,psych,technical,report,success}
mkdir -p app/(rh)/dashboard
mkdir -p components lib
```

Prompt sugerido para Claude Code:
> "Lee el README.md y los archivos HTML de design_handoff_ma_baker_rrhh/. Recrea el flujo del candidato como rutas Next.js App Router en TypeScript, usando Tailwind para los design tokens del README, Supabase para persistencia con el schema dado, y React Server Components donde sea posible. Mantén el estado global entre vistas con un context provider o Zustand. Empieza por la vista `welcome` y avanza secuencialmente, parando para revisión después de cada vista."
