# Arquitectura RBAC y Flujo Supabase

## Modelo de Datos
El sistema utiliza Supabase como motor de persistencia con las siguientes tablas clave:

- `catalogo_puestos`: Contiene las matrices de requisitos por vacante.
- `prospectos_rechazados`: Histórico de aplicantes que no superaron los filtros dinámicos.
- `candidatos_activos`: Pipeline de selección (fases: psicometría, entrevistas, médico, inducción).
- `empleados_activos`: Registro final tras contratación.
- `seguridad_medica` (Cifrada): Historial clínico accesible solo por el rol `medico`.

## Control de Acceso (RBAC)
- **Admin/TI:** Control total.
- **RRHH:** Gestión de prospectos y candidatos. Solo recibe veredictos médicos (No detalle).
- **Médico:** Acceso único a datos de salud. Emite veredicto `APROBADO/RECHAZADO/CONDICIONADO`.
- **Jefe de Área:** Evalúa competencia técnica mediante Scorecards.
- **SGI/Seguridad:** Audita la inducción y autoriza el paso a nómina.

## Seguridad de Datos (RLS)
Se implementan Políticas de Seguridad a Nivel de Fila para garantizar la privacidad y cumplimiento legal (Aviso de Privacidad).
