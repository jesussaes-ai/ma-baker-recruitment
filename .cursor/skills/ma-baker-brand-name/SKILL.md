---
name: ma-baker-brand-name
description: >-
  Aplica el nombre oficial Ma Baker and Chef en UI, docs, correos, SQL seed y copy
  del agente. Usar al escribir títulos HTML, banners, emails, README, modales,
  dashboards, asuntos de correo, seeds SQL o cualquier texto de marca del proyecto
  Ma Baker. También si aparece "Ma Baker" sin "and Chef" o "&" en lugar de "and".
---

# Marca — Ma Baker and Chef

## Nombre oficial

```
Ma Baker and Chef
```

Escritura exacta: **Ma Baker and Chef** (con "and" en minúsculas, "Chef" con C mayúscula).

## Fuente única en código

```javascript
// app/js/brand.js
window.MB_BRAND.COMPANY_NAME  // → "Ma Baker and Chef"
```

En runtime de correos/postulación:

```javascript
CFG.COMPANY_NAME  // app/js/config.js — default "Ma Baker and Chef"
```

No hardcodear el nombre en HTML si ya existe constante en `brand.js` o `config.js`.

## Logo (UI)

- Ruta preferida: `~/.cursor/brand-assets/ma-baker-and-chef/logo-oficial.png`
- Si no existe, usar asset del repo o pedir al usuario la ruta correcta.
- Pantallas: login, portal candidato, dashboard principal.
- `alt="Ma Baker and Chef"`, `object-fit: contain` en móvil.

## Checklist rápido

- [ ] `<title>` de HTML incluye "Ma Baker and Chef"
- [ ] Banners y sidebars no dicen solo "Ma Baker"
- [ ] Asuntos de correo: `Ma Baker and Chef — …`
- [ ] Documentación y README usan nombre completo
- [ ] No usar `&` en lugar de `and` en copy de marca

## Variantes a corregir

| Incorrecto | Correcto |
|------------|----------|
| Ma Baker | Ma Baker and Chef |
| Ma Baker & Chef | Ma Baker and Chef |
| Administración — Ma Baker | Administración — Ma Baker and Chef |

## Reglas relacionadas

- `.cursor/rules/nombre-oficial-ma-baker-and-chef.mdc` (alwaysApply)
- Skill global de UX reclutamiento: `~/.cursor/skills/global-recruitment-ux-guardrails/` (contraste, tarjetas, branding)
