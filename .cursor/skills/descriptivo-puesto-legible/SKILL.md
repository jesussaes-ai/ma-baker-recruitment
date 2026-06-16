---
name: descriptivo-puesto-legible
description: >-
  Formatea descripciones de puesto importadas (PDF/Word) en HTML legible para
  modales y portal Ma Baker and Chef. Usar al trabajar job-description-format.js,
  modal Ver descripción, cargar-puestos, bloques MAYÚSCULAS densos, etiquetas
  ilegibles, pies de modal desalineados o cuando el usuario pida descriptivos
  bien presentados, interfaz clara o formato continuo sin repetir correcciones.
---

# Descriptivo de puesto legible — Ma Baker and Chef

## Objetivo

Todo descriptivo visible al usuario (modal **Ver descripción**, `cargar-puestos.html`, previews) debe leerse en segundos: secciones claras, subtítulos, viñetas y contraste correcto en modo claro y oscuro. **Nunca** mostrar un bloque único en MAYÚSCULAS sin estructura.

## Fuente única de formato

| Pieza | Archivo |
|-------|---------|
| Parser HTML | `app/js/job-description-format.js` → `window.MB_JOB_DESC.formatHtml` |
| Estilos documento | `app/js/theme.js` → `injectModalDetailStyles()` (clases `mb-job-*`) |
| Modal RRHH/Admin | `#modalVerVacante` en `dashboard-rrhh.html` / `dashboard-admin.html` |
| Caché script | `?v=20260616f` (subir al cambiar el formateador) |

## Reglas de contenido (obligatorias)

1. **Regla visual:** `Etiqueta: valor` en campos estructurados (identificación, requisitos).
2. **Bloques densos PDF:** preprocesar con `preprocessStructuredText()` antes de formatear.
3. **MAYÚSCULAS → legible:** `toReadableCase()` convierte títulos a título capitalizado y cuerpo a oración normal; no forzar `text-transform: uppercase` en CSS del cuerpo.
4. **Estructura mínima esperada:**
   - Sección `h5` solo para bloques mayores (*Funciones y responsabilidades*, *Requisitos*, *Identificación*).
   - Subsección `h6.mb-job-subsection-title` para encabezados de actividad (*Gestión de pedidos por canal de venta*).
   - Responsabilidades concretas en `div.mb-job-bullet` (viñetas), no párrafos largos.
5. **No emparejar oraciones como etiqueta:valor** — líneas que terminan en `.` y superan ~28 caracteres no son etiquetas de formulario.
6. **Experiencia:** usar `1 año` / `N años` (no `1 años`).

## Checklist antes de dar por terminado

```md
- [ ] Texto de prueba con bloque MAYÚSCULAS denso → secciones + subtítulos + viñetas
- [ ] Modal Ver descripción en modo claro: fondo blanco, textos oscuros, viñetas visibles
- [ ] Modal Ver descripción en modo oscuro: mismo contraste lógico
- [ ] Pie del modal: badge estado + botones a la misma altura (`mb-modal-footer--balanced`, `min-height: 44px`)
- [ ] Ctrl+F5 tras cambiar `job-description-format.js` o `theme.js`
- [ ] Sin bloque `<p>` único >200 caracteres en MAYÚSCULAS
```

## Probar rápido (Node)

```javascript
global.window = {};
require("./app/js/job-description-format.js");
const html = window.MB_JOB_DESC.formatHtml("TEXTO CRUDO DEL PDF...");
console.log(html.includes("mb-job-subsection-title"));
console.log(html.includes("mb-job-bullet"));
```

## UI del modal (patrón)

- Contenedor: `mb-modal-detail` + `mb-modal-overlay` (tema coherente claro/oscuro).
- Cuerpo descriptivo: `#verV_desc.mb-job-doc-root` con HTML de `MB_JOB_DESC.formatHtml`.
- Pie: `mb-modal-footer--balanced`, botones `mb-modal-btn`, badge `mb-modal-status`.
- z-index modal visible: `z-[200]` / reglas `#modalVerVacante:not(.hidden)`.

## Relacionado

- Skill global UX: `global-recruitment-ux-guardrails` (contraste, tarjetas vacante).
- Marca: `ma-baker-brand-name` (Ma Baker and Chef).
- Doc técnica: `docs/catalogo-vacantes-dashboard.md`.

## Anti-patrones (corregir si aparecen)

| Mal | Bien |
|-----|------|
| Párrafo único en MAYÚSCULAS | Sección + subtítulos + viñetas |
| `onclick` con id escapado HTML | `data-vacante-action` + delegación en `dashboard.js` |
| Modal abre después de `formatHtml` | Abrir modal primero; `try/catch` en formato |
| Etiquetas grises ilegibles en oscuro | Clases `mb-cfg-option-label` / `mb-job-field-label` en `theme.js` |
| Tres botones a distinta altura | `mb-modal-btn` + `items-center` en footer |
