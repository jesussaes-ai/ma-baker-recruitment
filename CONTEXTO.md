# CONTEXTO DEL PROYECTO: Sistema de Reclutamiento Ma Baker and Chef
<!-- Documento de referencia para NotebookLM y continuidad entre sesiones -->
<!-- Última actualización: 2026-03-07 01:19 CST -->

---

## 1. Empresa

**Ma Baker and Chef** — Empresa mexicana de producción y venta de productos de panadería y repostería.
- Sitio web: https://www.mabakerandchef.com
- Colores oficiales: Rojo `#D7282F` y Azul `#0071BC`
- Tipografía: Montserrat

---

## 2. Objetivo del Sistema

Sistema agéntico de reclutamiento y selección de talento integrado con Supabase. El proceso inicia cuando **Reclutamiento y Selección de Talento** envía un link al prospecto para que llene su formulario inicial y realice sus baterías psicométricas. El agente IA evalúa automáticamente al prospecto, lo clasifica y lo mueve por el pipeline de selección.

---

## 3. Tecnología

| Componente | Tecnología |
|---|---|
| Base de datos | Supabase (PostgreSQL) |
| Project URL | https://znskpdixdyxdbvpapqrg.supabase.co |
| Project Ref | znskpdixdyxdbvpapqrg |
| Frontend | HTML + Vanilla CSS + JavaScript |
| Fuente | Google Fonts — Montserrat |
| Repositorio | Git local → GitHub (pendiente push) |

---

## 4. Flujo de Reclutamiento

```
RRHH envía link al prospecto
        ↓
Prospecto llena formulario + psicométricos (desde celular)
        ↓
Agente IA evalúa y calcula score
        ↓
Score < umbral → prospectos_rechazados (notificación automática)
Score ≥ umbral → candidatos_activos (fase: espera_psicometricos)
        ↓
RRHH revisa candidatos → agenda entrevista
        ↓
Médico empresarial → examen médico → veredicto (APTO / NO_APTO / CONDICIONADO)
        ↓
Jefe del área → evaluación técnica
        ↓
SGI (Calidad) → inducción BPM, HACCP, alérgenos, trazabilidad (7 puntos)
Seguridad e Higiene → inducción EPP, NOM-017, IMSS, emergencias (7 puntos)
        ↓
Listo para contrato → CONTRATADO
```

---

## 5. Base de Datos — Tablas en Supabase (11 tablas activas)

### Tabla 1: `catalogo_puestos`
Catálogo de vacantes con criterios para el scoring IA.
- Campos clave: `codigo_puesto`, `nombre_puesto`, `departamento`, `edad_minima/maxima`, `escolaridad_minima`, `experiencia_minima_anios`, `sueldo_minimo/maximo`
- Ponderación del score: `peso_experiencia` (40) + `peso_tecnico` (30) + `peso_estabilidad` (30) = 100
- **5 puestos cargados:** QC-001, ALM-001, MIX-001, ADM-001, VEN-001
- Soporta carga desde PDF (`fuente_pdf = true`, `nombre_archivo_fuente`, `descripcion_completa`)

### Tabla 2: `prospectos_rechazados`
Histórico de todos los que NO pasaron el filtro IA. Incluyen datos completos del formulario + `razon_rechazo` y `filtro_fallido`.

### Tabla 3: `candidatos_activos`
Pipeline de candidatos que sí pasaron. Fases:
- `espera_psicometricos` → `psicometricos_realizados` → `espera_medico` → `espera_jefe` → `induccion_sgi` → `listo_para_contrato` → `contratado`

### Tabla 4: `seguridad_medica`
Datos médicos sensibles. Solo visible para el rol `medico`. RLS activado. Campos: `tension_arterial`, `peso`, `talla`, `glucosa`, `veredicto` (APTO/NO_APTO/CONDICIONADO).

### Tabla 5: `pruebas_psicometricas`
Catálogo de baterías psicométricas disponibles (Terman, Personalidad, Inteligencia emocional, etc.). Con categoría, instrucciones, tiempo límite y score mínimo aprobatorio.

### Tabla 6: `preguntas_psicometricas`
Banco de preguntas por batería. Soporta: `opcion_multiple`, `escala_likert`, `verdadero_falso`, `ordenamiento`, `texto_libre`. Versionado — se puede cambiar sin perder historial.

### Tabla 7: `evaluaciones_psicometricas`
Resultados por candidato. Incluye token de acceso único, estado, score, respuestas JSON y perfil por dimensión.

### Tabla 8: `log_agente`
Trazabilidad completa de cada decisión de la IA: input, output, score, reasoning, filtros aplicados.

### Tabla 9: `usuarios_sistema`
Usuarios internos con control de acceso. **6 roles:**
- `admin` — Administrador General
- `rrhh` — Reclutamiento y Selección de Talento
- `medico` — Médico Empresarial
- `jefe` — Jefe de Área
- `sgi` — Sistema de Gestión Integral de **Calidad** (BPM, HACCP, Inocuidad)
- `seguridad` — **Seguridad e Higiene** (EPP, NOM-017, IMSS, Emergencias)

> **IMPORTANTE:** SGI y Seguridad e Higiene son departamentos SEPARADOS con accesos independientes.

### Tabla 10: `puesto_prueba_config`
Configura qué batería psicométrica aplica a cada puesto: orden, si es obligatoria, score mínimo específico por puesto y momento de aplicación (pre/durante/post entrevista).

---

## 6. RBAC — Roles y Dashboards

| Rol | Email | Contraseña | Dashboard | Funciones |
|---|---|---|---|---|
| admin | admin@mabakerandchef.com | MaBaker2024! | dashboard-admin.html | Acceso total |
| rrhh | rrhh@mabakerandchef.com | RRHH2024! | dashboard-rrhh.html | Candidatos, rechazados, psicométricos, PDFs |
| medico | medico@mabakerandchef.com | Medico2024! | dashboard-medico.html | Solo datos clínicos |
| jefe | jefe.calidad@mabakerandchef.com | Jefe2024! | dashboard-jefe.html | Solo su área |
| sgi | sgi@mabakerandchef.com | SGI2024! | dashboard-sgi.html | BPM, HACCP, Alérgenos, Trazabilidad (7 puntos) |
| seguridad | sh@mabakerandchef.com | SH2024! | dashboard-seguridad.html | EPP, NOM-017, Químicos, IMSS (7 puntos) |

---

## 7. Estructura de Archivos del Proyecto

```
ma-baker-recruitment/
├── app/
│   ├── index.html                    ← Formulario para candidatos (mobile-first)
│   ├── login.html                    ← Login único centralizado
│   ├── dashboard-admin.html          ← Admin: acceso total
│   ├── dashboard-rrhh.html           ← RRHH: candidatos y rechazados
│   ├── dashboard-medico.html         ← Médico: datos clínicos
│   ├── dashboard-jefe.html           ← Jefe: su área
│   ├── dashboard-sgi.html            ← SGI: inducción Calidad
│   ├── dashboard-seguridad.html      ← Seguridad e Higiene
│   ├── cargar-puestos.html           ← Drag & drop de PDFs de puestos
│   ├── cargar-psicometricos.html     ← Gestión de baterías por puesto
│   ├── assets/
│   │   ├── logo.webp                 ← Logo oficial Ma Baker
│   │   └── favicon.ico
│   ├── styles/
│   │   ├── main.css
│   │   └── dashboard.css
│   └── js/
│       ├── auth.js                   ← RBAC + rutas por rol (documentado en español)
│       ├── app.js                    ← Formulario candidatos + scoring IA (documentado)
│       └── dashboard.js              ← Lógica de dashboards (documentado en español)
├── database/
│   ├── schema.sql                    ← Schema completo v2.0 (referencia)
│   ├── crear-tablas.js               ← Script Node.js para ejecutar en Supabase vía PAT
│   └── ejecutar-api.js               ← Versión alternativa del script
├── CREDENCIALES.md                   ← Credenciales completas (excluido de git)
├── CONTEXTO.md                       ← Este archivo
└── .gitignore
```

---

## 8. Credenciales del Proyecto (resumen)

| Servicio | Detalle |
|---|---|
| Supabase URL | https://znskpdixdyxdbvpapqrg.supabase.co |
| Supabase Email | jesussaes@gmail.com |
| PAT Supabase | sbp_5c53d56dc466b7fe0ca021dc07239d966a49967a |
| Service Role Key | eyJhbGci... (ver CREDENCIALES.md) |
| GitHub Usuario | jesusSan61 |
| GitHub Repo | ma-baker-recruitment (pendiente crear) |

> Las contraseñas completas están en `CREDENCIALES.md` (excluido de git).

---

## 9. Pendientes para Próxima Sesión

1. **Cargar PDFs de descripciones de puesto** — El usuario los entregará en el chat (drag & drop)
2. **Push a GitHub** — Crear repo `jesusSan61/ma-baker-recruitment` en github.com → luego hacer `git remote add origin` + `git push`
3. **NotebookLM** — Agregar este `CONTEXTO.md` al cuaderno existente
4. **Baterías psicométricas** — Poblar `preguntas_psicometricas` con las baterías reales (Terman, Personalidad, etc.)
5. **Envío de links** — Implementar envío de link único por email a candidatos para que hagan sus psicométricos
6. **Prueba end-to-end** — Formulario candidato → Supabase → Dashboard RRHH en vivo

---

## 10. Notas Técnicas Importantes

- **Código documentado en español:** Todos los archivos JS tienen comentarios en español para que el equipo pueda entenderlos sin conocimiento técnico avanzado.
- **Las preguntas psicométricas son expandibles:** Se pueden agregar nuevas baterías y nuevas preguntas sin modificar el schema, simplemente agregando filas a las tablas correspondientes.
- **SGI ≠ Seguridad e Higiene:** Son roles y dashboards completamente separados. El rol `sgi` evalúa los 7 puntos de Calidad e Inocuidad. El rol `seguridad` evalúa los 7 puntos de Seguridad e Higiene.
- **El script `crear-tablas.js`** puede volver a ejecutarse en cualquier momento para recrear el schema (usa `IF NOT EXISTS`).
- **El PAT de Supabase** debe usarse para la Management API (`api.supabase.com`). El service_role key se usa para la REST API (`supabase.co/rest/v1/`).
