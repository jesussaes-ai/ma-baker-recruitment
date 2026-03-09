/**
 * Ejecuta el schema completo de Ma Baker en Supabase.
 * Usa el Service Role Key para la Management API v1.
 * Ejecutar con: node database/crear-tablas.js
 */
const https = require('https');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2twZGl4ZHl4ZGJ2cGFwcXJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg1ODgwOCwiZXhwIjoyMDg4NDM0ODA4fQ.s7yC5ODssUgqHjH0PsAhTZuNQ1R-lMuJAt62OKDwryg';
const REF = 'znskpdixdyxdbvpapqrg';

// Función que ejecuta un SQL via Management API
function sql(query, label) {
    return new Promise(resolve => {
        const body = JSON.stringify({ query });
        const req = https.request({
            hostname: 'api.supabase.com',
            port: 443,
            path: `/v1/projects/${REF}/database/query`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SERVICE_KEY,
                'Content-Length': Buffer.byteLength(body)
            }
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                const ok = res.statusCode >= 200 && res.statusCode < 300;
                if (ok) {
                    console.log(`  [OK]  ${label}`);
                } else {
                    let msg = d;
                    try { msg = JSON.parse(d).message || d; } catch (e) { }
                    console.log(`  [ERR] ${label} => ${msg.substring(0, 120)}`);
                }
                resolve(ok);
            });
        });
        req.on('error', e => { console.log(`  [ERR] ${label} => ${e.message}`); resolve(false); });
        req.write(body);
        req.end();
    });
}

async function main() {
    console.log('\n=======================================');
    console.log('   Ma Baker — Creando tablas Supabase');
    console.log('=======================================\n');

    // 01 — Extensiones de PostgreSQL necesarias
    await sql(
        `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
        '01 Extensiones uuid-ossp + pgcrypto'
    );

    // 02 — Catálogo de puestos de trabajo
    await sql(`
        CREATE TABLE IF NOT EXISTS public.catalogo_puestos (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            codigo_puesto TEXT NOT NULL UNIQUE,
