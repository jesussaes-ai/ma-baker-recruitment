---
name: ma-baker-brand-name
description: >-
  Aplica el nombre oficial de la empresa Ma Baker and Chef en UI, docs, correos,
  SQL seed y copy del agente. Usar cuando escribas títulos, banners, emails,
  README, modales, dashboards o cualquier texto de marca.
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

## Regla Cursor

`.cursor/rules/nombre-oficial-ma-baker-and-chef.mdc` (alwaysApply)
