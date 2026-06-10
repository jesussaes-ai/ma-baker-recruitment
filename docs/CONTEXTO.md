# Sistema de Reclutamiento y Selección de Talento
## Ma Baker and Chef — Documento de Contexto del Proyecto

**Generado**: 2026-03-07 | **Versión**: 2.0  
**GitHub**: [jesusSan61/ma-baker-recruitment](https://github.com/jesusSan61/ma-baker-recruitment)  
**NotebookLM**: Reclutamiento y Seleccion de Personal Automatizado: Ma Baker and Chef

---

## 🏢 Empresa

- **Nombre oficial**: Ma Baker and Chef
- **Sitio web**: [www.mabakerandchef.com](https://www.mabakerandchef.com)
- **Giro**: Distribución de insumos para repostería y panadería
- **Slogan**: "Color and Flavor"

### Identidad Visual (extraída del sitio oficial)
| Elemento | Valor |
|---|---|
| Color primario | `#D7282F` (Rojo — header del sitio) |
| Color acento | `#0071BC` (Azul — footer del sitio) |
| Color neutro | `#1C1C1C` (Negro) |
| Color fondo | `#FFFFFF` (Blanco) |
| Tipografía principal | `Montserrat` (Google Fonts) |
| Logo | Descargado de mabakerandchef.com (webp oficial) |

---

## 🤖 Arquitectura del Sistema

### Stack Tecnológico
- **Frontend**: HTML5 + CSS3 + JavaScript Vanilla (Mobile-First)
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Custom RBAC via Supabase RPC functions
- **Hosting**: Puede desplegarse en Netlify / Vercel / GitHub Pages

### Credenciales Supabase (Proyecto RRHH)
- **Project URL**: `https://znskpdixdyxdbvpapqrg.supabase.co`
- **Publishable Key**: `sb_publishable_YLgLfp_OIJLmimFo1vWStg_-THES9lw`
- **Proyecto**: micro / RRHH

---

## 🗄️ Estructura de la Base de Datos

### Tablas Principales

| Tabla | Propósito | Acceso |
|---|---|---|
| `catalogo_puestos` | Vacantes con criterios de evaluación (puede cargarse desde PDF) | anon (lectura), service_role |
| `candidatos_activos` | Prospectos que **SÍ** pasaron el filtro IA (score ≥ 80%) | rrhh, admin, medico, jefe, sgi |
| `prospectos_rechazados` | Prospectos que **NO** pasaron el filtro IA | rrhh, admin |
| `seguridad_medica` | Datos clínicos sensibles (RLS estricto) | medico, admin |
| `evaluaciones_psicometricas` | Resultados de Terman Merril y baterías | rrhh, admin |
| `log_agente` | Trazabilidad completa de decisiones IA | admin |
| `usuarios_sistema` | Usuarios del sistema con roles (RBAC) | admin |

### Ciclo de Vida del Candidato
```
formulario_web
    ↓ [Agente IA evalúa — score 0-100]
    ├─ score < 80% → prospectos_rechazados (FIN)
    └─ score ≥ 80% → candidatos_activos
                          ↓ fase: espera_psicometricos
                          ↓ [Link único enviado automáticamente]
                          ↓ fase: psicometricos_realizados
                          ↓ fase: espera_medico
                          ↓ fase: espera_jefe
                          ↓ fase: induccion_sgi
                          ↓ fase: listo_para_contrato
                          ↓ fase: contratado
```

---

## 🔐 Control de Acceso (RBAC)

| Rol | Email | Acceso |
|---|---|---|
| `admin` | admin@mabakerandchef.com | **TODO**: candidatos, rechazados, médico, jefes, SGI, usuarios, logs, puestos |
| `rrhh` | rrhh@mabakerandchef.com | Candidatos, rechazados, psicométricos, vacantes, envío links |
| `medico` | medico@mabakerandchef.com | Solo datos clínicos (`seguridad_medica`) |
| `jefe` | jefe@mabakerandchef.com | Candidatos de **su departamento** únicamente |
| `sgi` | sgi@mabakerandchef.com | Inducción SGI, alertas BPH |

---

## 📂 Estructura de Archivos del Proyecto

```
ma-baker-recruitment/
├── app/
│   ├── assets/
│   │   ├── logo.webp          # Logo oficial descargado de mabakerandchef.com
│   │   └── favicon.ico        # Favicon oficial del sitio
│   ├── styles/
│   │   ├── main.css           # Design system + colores de marca (#D7282F, #0071BC, Montserrat)
│   │   └── dashboard.css      # Estilos dashboards, tablas, PDF upload zone
│   ├── js/
│   │   ├── auth.js            # RBAC: login, logout, session, role routing
│   │   ├── app.js             # Formulario candidato: 23 puntos, score, Supabase submit
│   │   └── dashboard.js       # Renderizado de tablas y estadísticas
│   ├── login.html             # Login central (todos los roles)
│   ├── index.html             # Formulario público de postulación (23 puntos)
│   ├── cargar-puestos.html    # Carga de PDFs de descripciones de puesto
│   ├── dashboard-admin.html   # Dashboard Administrador General
│   ├── dashboard-rrhh.html    # Dashboard RRHH
│   ├── dashboard-medico.html  # Dashboard Médico
│   ├── dashboard-jefe.html    # Dashboard Jefe de Área
│   └── dashboard-sgi.html     # Dashboard SGI / Seguridad
├── database/
│   ├── schema.sql             # Esquema completo v2.0 (7 tablas + RLS + funciones auth)
│   ├── usuarios.sql           # Usuarios iniciales con bcrypt
│   └── run_schema.ps1         # Script PowerShell para ejecutar schema en Supabase
├── skills/
│   ├── hr_multi_job_processor_003/SKILL.md   # Skill: Matching candidato-puesto
│   └── mb_sgi_safety_auditor_006/SKILL.md    # Skill: Auditoría SGI
├── prompts/
│   └── system_prompt.md       # Prompt Maestro del Orquestador de Reclutamiento
├── docs/
│   ├── architecture.md        # Arquitectura RBAC y Supabase
│   └── CONTEXTO.md            # Este archivo — contexto completo del proyecto
├── .env                       # Credenciales Supabase (NO subir a GitHub)
└── README.md                  # Documentación del proyecto
```

---

## 🔄 Flujo de Reclutamiento (Confirmado por NotebookLM)

### Fase 1: Auto-Servicio (Sin intervención de RRHH)
1. Candidato ve la vacante en `www.mabakerandchef.com/bolsa-de-trabajo/`
2. Hace clic en **"Postularme"**
3. **Bloqueo Legal 1**: Aviso de Privacidad General (scroll completo + aceptación obligatoria)
4. Llena formulario de **23 puntos**: datos personales, salud preliminar, escolaridad, historial de 5 empleos
5. Sistema muestra: *"Tu perfil está siendo analizado por la IA"*

### Fase 2: Evaluación Automatizada (Agente IA)
6. Agente consulta `catalogo_puestos` y calcula **Match Score** (0-100%)
7. **Score < 80%**: → `prospectos_rechazados` + correo de agradecimiento automático
8. **Score ≥ 80%**: → `candidatos_activos` con `fase = 'espera_psicometricos'`

### Fase 3: Psicométricos (Automatizado)
9. Sistema envía automáticamente correo/WhatsApp con **enlace único** al candidato
10. **Bloqueo Legal 2**: Aviso de Privacidad específico para datos psicológicos
11. Candidato realiza baterías en línea (Terman Merril, personalidad, razonamiento)
12. Sistema genera **gráfica comparativa** perfil candidato vs perfil ideal del puesto
13. RRHH visualiza resultados en "Torre de Control" → Gestor de Psicométricos

### Fase 4: Entrevista y Evaluación Física
14. RRHH contacta al candidato para cita presencial
15. Evaluación con Servicio Médico
16. Evaluación técnica con Jefe del Área

### Fase 5: Inducción SGI
17. SGI realiza inducción de seguridad e higiene
18. Se verifican BPH (Buenas Prácticas de Higiene)

### Fase 6: Contratación
19. Firma de documentos, entrega de uniforme y EPP

---

## 🆕 Funcionalidades Recientes Implementadas

### Cargador de PDFs de Descripciones de Puesto (`cargar-puestos.html`)
- **Drag & Drop** o selección de múltiples PDFs
- Extractor automático de campos: nombre puesto, departamento, escolaridad, edad, experiencia, sueldo
- Inferencia de departamento por palabras clave del nombre del puesto
- Carga directa a Supabase tabla `catalogo_puestos`
- Cola visual de progreso por archivo
- Resumen de carga (exitosos / con errores)
- Accesible desde el Dashboard Admin

### Branding Real Aplicado
- Logo descargado del sitio oficial (`.webp`)
- Favicon oficial del sitio (`.ico`)
- Colores `#D7282F` y `#0071BC` en todas las páginas
- Tipografía `Montserrat` en toda la aplicación

---

## ⚙️ Configuración y Despliegue

### Paso 1: Ejecutar el Schema SQL
1. Ir a [Supabase Dashboard](https://supabase.com/dashboard/project/znskpdixdyxdbvpapqrg)
2. Clic en **SQL Editor**
3. Pegar el contenido completo de `database/schema.sql`
4. Ejecutar

### Paso 2: Configurar Variables
- Copiar `.env.example` a `.env` y completar valores reales.
- No guardar credenciales reales en el repositorio.
- En frontend usar solo `SUPABASE_ANON_KEY`.

### Paso 3: Abrir la Aplicación
- Abrir `app/login.html` en un navegador
- Crear usuarios de acceso mediante scripts seguros o panel de administración.

---

## 📋 Pendientes

- [ ] **CRÍTICO**: Ejecutar `schema.sql` en Supabase para crear las tablas
- [ ] Implementar `dashboard.js` con renderizado real de tablas
- [ ] Módulo de envío de links psicométricos (correo/WhatsApp)
- [ ] Implementar baterías psicométricas en línea (Terman Merril)
- [ ] Gráfica comparativa de perfil psicológico
- [ ] Sistema de notificaciones por correo (SMTP/SendGrid)
- [ ] Cargar descripciones de puesto en PDF (herramienta lista, esperando PDFs del usuario)
- [ ] Testing end-to-end del flujo completo
