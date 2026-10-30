---
name: supabase-deploy
description: Despliega esquemas SQL, políticas RLS y datos iniciales a un proyecto Supabase usando la Management API con Personal Access Token. No requiere browser ni Dashboard de Supabase.
---

# Skill: Supabase Deploy

## Objetivo
Ejecutar scripts SQL en Supabase de forma programática, sin abrir el browser. Útil para:
- Crear tablas con RLS
- Insertar datos de catálogos
- Aplicar migraciones
- Verificar estructura de tablas

## Prerequisitos
- Node.js instalado (`node --version`)
- Supabase Personal Access Token (PAT) — se obtiene en supabase.com/dashboard/account/tokens
- Project Reference ID (ej: `znskpdixdyxdbvpapqrg`)

## Variables requeridas
- `SUPABASE_PAT` — Personal Access Token de Supabase
- `SUPABASE_PROJECT_REF` — Reference ID del proyecto
- `SQL_FILE` — ruta al archivo `.sql` a ejecutar

## Script base (ejecutar-schema.js)
```javascript
const https = require('https');
const fs = require('fs');

const PAT = process.env.SUPABASE_PAT || 'tu_pat_aqui';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'tu_project_ref';
const SQL_FILE = process.argv[2] || './schema.sql';

const sql = fs.readFileSync(SQL_FILE, 'utf8');

const data = JSON.stringify({ query: sql });

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PAT}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ SQL ejecutado exitosamente');
    } else {
      console.error(`❌ Error ${res.statusCode}:`, body);
    }
  });
});

req.on('error', console.error);
req.write(data);
req.end();
```

## Pasos

### 1. Obtener el PAT
Ve a: https://supabase.com/dashboard/account/tokens
Crea un token con descripción identificable (ej: `antigravity-deploy`)

### 2. Ejecutar SQL
```powershell
# Opción A: Variable de entorno (recomendado)
$env:SUPABASE_PAT = "sbp_xxxx"
$env:SUPABASE_PROJECT_REF = "tu_project_ref"
node ejecutar-schema.js ./schema.sql

# Opción B: Directo en el script (no para producción)
node ejecutar-schema.js ./schema.sql
```

### 3. Verificar tablas creadas
```javascript
// Agregar al script para verificar:
const verifyQuery = `
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
`;
```

### 4. Insertar datos de catálogo
```javascript
// Separar el SQL en bloques y ejecutar secuencialmente
// Ver patrón en /database/crear-tablas.js del proyecto ma-baker
```

## Errores comunes
| Error | Causa | Solución |
|-------|-------|----------|
| `401 Unauthorized` | PAT inválido o expirado | Regenerar en supabase.com |
| `404 Not Found` | Project Ref incorrecto | Verificar en Settings > General |
| `syntax error at...` | Error de SQL | Revisar el .sql y probar por partes |
| `permission denied` | RLS bloqueando | Usar service_role key para admin ops |

## Estructura recomendada de archivos
```
database/
  schema.sql          ← DDL: CREATE TABLE, RLS, políticas
  usuarios.sql        ← DML: INSERT de datos iniciales
  ejecutar-schema.js  ← Script de ejecución (usa esta skill)
  migraciones/
    001_add_campo.sql
    002_nueva_tabla.sql
```
