/* ==========================================
   Ma Baker & Chef — App JavaScript
   Lógica: navegación, validación, Supabase
   ========================================== */

const CFG = window.MB_CONFIG || {};
const SUPABASE_URL = CFG.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = CFG.SUPABASE_ANON_KEY || '';
const EMAIL_WEBHOOK_URL = CFG.EMAIL_WEBHOOK_URL || '';
const DOCUMENT_UPLOAD_WEBHOOK_URL = CFG.DOCUMENT_UPLOAD_WEBHOOK_URL || '';
const POSTULACION_TRANSFER_WEBHOOK_URL = CFG.POSTULACION_TRANSFER_WEBHOOK_URL || '';
const CANDIDATE_RESULT_EMAIL_OVERRIDE = CFG.CANDIDATE_RESULT_EMAIL_OVERRIDE || '';
const RECRUITER_EMAILS = Array.isArray(CFG.RECRUITER_EMAILS) ? CFG.RECRUITER_EMAILS : [];
const COMPANY_NAME = CFG.COMPANY_NAME || 'Ma Baker and Chef';

/* ── Estado de la App ── */
let currentStep = 0;
const TOTAL_STEPS = 5;
let selectedVacante = null;
let cachedVacantesHTML = '';
let lastSubmissionContext = null;
const VACANTES_REFRESH_MS = 45000;
let vacantesRefreshTimer = null;

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function queryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function isEmbeddedMode() {
    return window.self !== window.top || queryParam('embed') === '1';
}

function isStandaloneMode() {
    return queryParam('standalone') === '1' || isEmbeddedMode();
}

function applyStandaloneMode() {
    if (!isStandaloneMode()) return;
    const helpLink = document.getElementById('candidateHelpLink');
    if (helpLink) helpLink.style.display = 'none';
}

function emitPostulacionEvent(type, detail = {}) {
    const payload = { channel: 'mb-postulacion', type, detail, at: new Date().toISOString() };
    window.dispatchEvent(new CustomEvent(`mb:postulacion:${type}`, { detail: payload }));
    if (isEmbeddedMode()) {
        window.parent.postMessage(payload, '*');
    }
}

function splitMedicalData(payload) {
    const medicalKeys = [
        'enfermedades_cronicas',
        'medicamentos',
        'discapacidades',
        'tipo_sangre',
    ];
    const medical = {};
    const operational = { ...payload };
    medicalKeys.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(operational, k)) {
            medical[k] = operational[k];
            delete operational[k];
        }
    });
    return { operational, medical };
}

async function transferSubmissionData(payload, result, mailResult) {
    const split = splitMedicalData(payload);
    const transferPayload = {
        modulo: 'postulacion_candidato',
        origen: payload.origen_postulacion || 'ONLINE',
        candidato_id: result?.insertedId || null,
        decision: result?.decision || null,
        score: result?.score ?? null,
        correo: {
            intentado: !!mailResult?.attempted,
            ok: !!mailResult?.ok,
        },
        data_operativa: split.operational,
        data_medica_confidencial: split.medical,
        route_hints: {
            rrhh: 'solo data_operativa',
            admin: 'solo data_operativa',
            medico: 'data_operativa + data_medica_confidencial',
        },
        timestamp: new Date().toISOString(),
    };

    emitPostulacionEvent('submission_saved', transferPayload);

    if (!POSTULACION_TRANSFER_WEBHOOK_URL) {
        return { attempted: false, ok: false };
    }

    try {
        const resp = await fetch(POSTULACION_TRANSFER_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transferPayload),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        emitPostulacionEvent('submission_transferred', { candidato_id: result?.insertedId || null });
        return { attempted: true, ok: true };
    } catch (e) {
        emitPostulacionEvent('submission_transfer_error', { error: e.message || 'error desconocido' });
        return { attempted: true, ok: false, error: e.message || 'error desconocido' };
    }
}

const VACANTE_TEMPLATES = {
    'QC-001': {
        nombre: 'Analista de Control de Calidad',
        departamento: 'Calidad e Inocuidad',
        resumen: 'Verifica estándares de calidad, inocuidad y cumplimiento de procesos.',
        escolaridad: 'Licenciatura',
        experiencia: '1 año de experiencia',
        edad: '22-35 años',
        icono: '🧪',
    },
    'ALM-001': {
        nombre: 'Auxiliar de Almacén',
        departamento: 'Logística y Almacén',
        resumen: 'Recibe, acomoda y controla inventario siguiendo normas de seguridad.',
        escolaridad: 'Preparatoria',
        experiencia: 'Sin experiencia',
        edad: '18-40 años',
        icono: '📦',
    },
    'MIX-001': {
        nombre: 'Mezclador de Producción',
        departamento: 'Producción',
        resumen: 'Prepara mezclas y apoya líneas de producción con apego a receta y tiempos.',
        escolaridad: 'Secundaria',
        experiencia: 'Sin experiencia',
        edad: '20-45 años',
        icono: '⚙️',
    },
    'ADM-001': {
        nombre: 'Auxiliar Administrativo',
        departamento: 'Administración',
        resumen: 'Apoya control documental, captura y seguimiento administrativo interno.',
        escolaridad: 'Licenciatura',
        experiencia: '1 año de experiencia',
        edad: '22-40 años',
        icono: '📊',
    },
    'VEN-001': {
        nombre: 'Ejecutivo de Ventas',
        departamento: 'Ventas',
        resumen: 'Atiende clientes, da seguimiento comercial y cumple metas de venta.',
        escolaridad: 'Preparatoria',
        experiencia: '1 año de experiencia',
        edad: '22-40 años',
        icono: '💼',
    },
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
    applyStandaloneMode();
    initPrivacyGate();
    initOrigenPostulacion();
    initPublicVacantesLink();
    initVacantesRefresh();
    initBirthDateMask();
    initVinculoInternoConditionals();
    initHealthConditionals();
    await loadVacantes();
});

/* =====================
   CARGA DE VACANTES
   ===================== */
async function loadVacantes(options = {}) {
    const silent = !!options.silent;
    const grid = document.getElementById('vacantesGrid');
    if (!silent) setVacantesUpdateStatus('Actualizando vacantes activas...');
    try {
        const resp = await supabaseGet('/rest/v1/catalogo_puestos?select=*&activo=eq.true&order=nombre_puesto.asc');

        if (!resp || resp.length === 0) {
            // Vacantes fallback si la tabla aún no tiene datos
            cachedVacantesHTML = renderVacanteFallback();
            renderVacantesByGate();
            setVacantesUpdateStatus('Sin vacantes activas en catálogo. Mostrando ejemplos temporales.');
            return;
        }
        cachedVacantesHTML = resp.map(v => renderVacanteCard(v)).join('');
        renderVacantesByGate();
        setVacantesUpdateStatus(`Vacantes actualizadas: ${new Date().toLocaleTimeString('es-MX')}`);
    } catch (err) {
        console.error('Error cargando vacantes:', err);
        cachedVacantesHTML = renderVacanteFallback();
        renderVacantesByGate();
        setVacantesUpdateStatus('Error de actualización. Reintentando automáticamente...');
    }
}

function setVacantesUpdateStatus(message) {
    const status = document.getElementById('vacantesUpdateStatus');
    if (status) status.textContent = String(message || '').toUpperCase();
}

function initVacantesRefresh() {
    const btn = document.getElementById('refreshVacantesBtn');
    if (btn) {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await loadVacantes();
                showToast('✅ Vacantes actualizadas desde catálogo activo.', 'success');
            } finally {
                btn.disabled = false;
            }
        });
    }

    if (vacantesRefreshTimer) clearInterval(vacantesRefreshTimer);
    vacantesRefreshTimer = setInterval(() => {
        if (document.hidden) return;
        if (selectedVacante) return;
        loadVacantes({ silent: true }).catch(() => {});
    }, VACANTES_REFRESH_MS);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        if (selectedVacante) return;
        loadVacantes({ silent: true }).catch(() => {});
    });

    window.addEventListener('focus', () => {
        if (selectedVacante) return;
        loadVacantes({ silent: true }).catch(() => {});
    });
}

function renderVacanteCard(v) {
    const codigo = (v.codigo_puesto || v.codigo || '').toUpperCase();
    const template = VACANTE_TEMPLATES[codigo] || {};
    const nombre = cleanPuestoNombre(v.nombre_puesto || v.nombre || template.nombre || 'Vacante disponible');
    const departamento = (v.departamento || template.departamento || 'General').trim();
    const resumen = summarizeVacante(v, template);
    const escolaridad = normalizeText(v.escolaridad_minima, template.escolaridad || 'A convenir');
    const experiencia = formatExperiencia(v.experiencia_minima_anios, template.experiencia || 'A convenir');
    const edad = formatEdad(v.edad_minima, v.edad_maxima, template.edad || 'A convenir');
    const icon = template.icono || puestoIcon(codigo, departamento, nombre);
    const safeId = jsSafe(v.id || `${codigo}-TEMP`);
    const safeCodigo = jsSafe(codigo || 'VAC-000');
    const safeNombre = jsSafe(nombre);
    return `
    <div class="vacante-card" onclick="selectVacante('${safeId}', '${safeCodigo}', '${safeNombre}')">
      <div class="vacante-icon">${icon}</div>
      <div class="vacante-info">
        <div class="vacante-nombre">${escapeHtml(nombre)}</div>
        <div class="vacante-depto">${escapeHtml(departamento)}</div>
        <p class="vacante-desc">${escapeHtml(resumen)}</p>
        <div class="vacante-meta">
          <div class="meta-chip"><div class="k">Escolaridad</div><div class="v">${escapeHtml(escolaridad)}</div></div>
          <div class="meta-chip"><div class="k">Experiencia</div><div class="v">${escapeHtml(experiencia)}</div></div>
          <div class="meta-chip"><div class="k">Edad</div><div class="v">${escapeHtml(edad)}</div></div>
        </div>
      </div>
      <div class="vacante-arrow">→</div>
    </div>
  `;
}

function renderVacanteFallback() {
    // Datos de ejemplo mientras se crea la BD
    const vacantes = [
        { id: 'QC-001-TEMP', codigo: 'QC-001', nombre: 'Analista de Control de Calidad', depto: 'Calidad e Inocuidad', icon: '🧪', escolaridad: 'Licenciatura', exp: '1 año exp.', edad: '22-35 años' },
        { id: 'ALM-001-TEMP', codigo: 'ALM-001', nombre: 'Auxiliar de Almacén', depto: 'Logística y Almacén', icon: '📦', escolaridad: 'Preparatoria', exp: 'Sin experiencia', edad: '18-40 años' },
        { id: 'MIX-001-TEMP', codigo: 'MIX-001', nombre: 'Mezclador de Producción', depto: 'Producción', icon: '⚙️', escolaridad: 'Secundaria', exp: 'Sin experiencia', edad: '20-45 años' },
    ];
    return vacantes.map(v => `
    <div class="vacante-card" onclick="selectVacante('${jsSafe(v.id)}', '${jsSafe(v.codigo)}', '${jsSafe(v.nombre)}')">
      <div class="vacante-icon">${v.icon}</div>
      <div class="vacante-info">
        <div class="vacante-nombre">${escapeHtml(v.nombre)}</div>
        <div class="vacante-depto">${escapeHtml(v.depto)}</div>
        <p class="vacante-desc">${escapeHtml((VACANTE_TEMPLATES[v.codigo] || {}).resumen || 'Vacante publicada para evaluación de perfil.')}</p>
        <div class="vacante-meta">
          <div class="meta-chip"><div class="k">Escolaridad</div><div class="v">${escapeHtml(v.escolaridad)}</div></div>
          <div class="meta-chip"><div class="k">Experiencia</div><div class="v">${escapeHtml(v.exp)}</div></div>
          <div class="meta-chip"><div class="k">Edad</div><div class="v">${escapeHtml(v.edad)}</div></div>
        </div>
      </div>
      <div class="vacante-arrow">→</div>
    </div>
  `).join('');
}

function selectVacante(id, codigo, nombre) {
    const privacyGate = document.getElementById('privacyGate');
    syncPrivacyGateState();
    if (!privacyGate || !privacyGate.checked) {
        showToast('⚠️ Acepta primero el aviso de privacidad para ver y seleccionar vacantes.', 'warning');
        return;
    }

    selectedVacante = { id, codigo, nombre };
    // Evita error 400 en Supabase cuando el id de vacante no es UUID (fallback/local).
    document.getElementById('id_puesto').value = isUuid(id) ? id : '';
    document.getElementById('codigo_puesto').value = codigo;
    const origenSel = document.getElementById('origenPostulacion');
    const origenDetTipo = document.getElementById('detalleOrigenPostulacionTipo');
    const origenDetOtro = document.getElementById('detalleOrigenPostulacionOtro');
    const origenHidden = document.getElementById('origen_postulacion');
    const detalleHidden = document.getElementById('detalle_origen_postulacion');
    if (origenHidden) origenHidden.value = (origenSel?.value || 'ONLINE').toUpperCase();
    if (detalleHidden) {
        const tipo = (origenDetTipo?.value || 'EMPRESA').toUpperCase();
        detalleHidden.value = tipo === 'OTRO'
            ? (origenDetOtro?.value || '').trim().toUpperCase()
            : tipo;
    }
    updatePuestoDisplays();

    // Ocultar selector, mostrar formulario
    document.getElementById('vacanteSelector').style.display = 'none';
    document.getElementById('applicationForm').style.display = 'block';
    document.getElementById('navButtons').style.display = 'flex';
    document.getElementById('progressBar').style.display = 'block';

    currentStep = 1;
    showStep(1);
    updateProgress();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =====================
   NAVEGACIÓN DE PASOS
   ===================== */
function showStep(step) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`step-${step}`);
    if (target) target.classList.add('active');

    document.getElementById('btnPrev').style.display = step > 1 ? 'block' : 'none';
    document.getElementById('btnNext').style.display = step < TOTAL_STEPS ? 'block' : 'none';
    document.getElementById('btnSubmit').style.display = step === TOTAL_STEPS ? 'block' : 'none';

    if (step === TOTAL_STEPS) buildSummary();
    updatePuestoDisplays();

    window.scrollTo({ top: 60, behavior: 'smooth' });
}

function nextStep() {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) {
        currentStep++;
        showStep(currentStep);
        updateProgress();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
        updateProgress();
    }
}

function updateProgress() {
    const pct = (currentStep / TOTAL_STEPS) * 100;
    document.getElementById('progressFill').style.width = pct + '%';

    document.querySelectorAll('.step-dot').forEach((dot, i) => {
        const stepN = i + 1;
        dot.classList.remove('active', 'completed');
        if (stepN === currentStep) dot.classList.add('active');
        else if (stepN < currentStep) dot.classList.add('completed');
    });
}

/* =====================
   VALIDACIÓN POR PASO
   ===================== */
function validateStep(step) {
    const stepEl = document.getElementById(`step-${step}`);
    if (!stepEl) return true;

    let valid = true;
    const required = stepEl.querySelectorAll('[required]');

    required.forEach(field => {
        field.classList.remove('invalid');
        if (!field.value.trim() || (field.type === 'checkbox' && !field.checked)) {
            field.classList.add('invalid');
            valid = false;
        }
    });

    if (step === 1) {
        const birthInput = stepEl.querySelector('input[name="fecha_nacimiento"]');
        if (birthInput) {
            const parsed = parseBirthDateDMY(birthInput.value);
            if (!parsed.valid) {
                birthInput.classList.add('invalid');
                valid = false;
                showToast('⚠️ Captura la fecha de nacimiento como DD/MM/AAAA', 'warning');
            }
        }
        const vinculoSel = document.getElementById('vinculo_interno_select');
        const vinculoDet = document.getElementById('vinculo_interno_detalle');
        if (!vinculoSel || !vinculoSel.value) {
            valid = false;
            vinculoSel?.classList.add('invalid');
            showToast('⚠️ Debes declarar si tienes familiar o amigo en la organización.', 'warning');
        } else if (vinculoSel.value === 'SI' && vinculoDet && !vinculoDet.value.trim()) {
            valid = false;
            vinculoDet.classList.add('invalid');
            showToast('⚠️ Indica quién es tu familiar o amigo dentro de la organización.', 'warning');
        }
    }

    if (step === 4) {
        const eSel = document.getElementById('enfermedades_cronicas_select');
        const eDet = document.getElementById('enfermedades_cronicas_detalle');
        if (eSel && eSel.value === 'Si' && eDet && !eDet.value.trim()) {
            eDet.classList.add('invalid');
            valid = false;
            showToast('⚠️ Si indicas enfermedad crónica, describe cuál.', 'warning');
        }

        const mSel = document.getElementById('medicamentos_select');
        const mDet = document.getElementById('medicamentos_detalle');
        if (mSel && mSel.value === 'Si' && mDet && !mDet.value.trim()) {
            mDet.classList.add('invalid');
            valid = false;
            showToast('⚠️ Si indicas medicamentos, especifica cuáles.', 'warning');
        }

        const dSel = document.getElementById('discapacidades_select');
        const dDet = document.getElementById('discapacidad_cuidados');
        if (dSel && dSel.value !== 'Ninguna' && dDet && !dDet.value.trim()) {
            dDet.classList.add('invalid');
            valid = false;
            showToast('⚠️ Indica qué cuidados requiere la discapacidad.', 'warning');
        }
    }

    if (!valid) {
        const firstInvalid = stepEl.querySelector('.invalid');
        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalid.focus();
        }
        showToast('⚠️ Por favor completa todos los campos obligatorios', 'warning');
    }

    return valid;
}

/* =====================
   EMPLEOS COLAPSABLES
   ===================== */
function toggleEmpleo(num) {
    const emp = document.querySelector(`.empleo-card[data-empleo="${num}"]`);
    const content = emp.querySelector('.empleo-content');
    const btn = emp.querySelector('.empleo-toggle span');

    if (content.style.display === 'none') {
        content.style.display = 'block';
        btn.textContent = `− Empresa ${num}`;
    } else {
        content.style.display = 'none';
        btn.textContent = `+ Agregar Empresa ${num} (Anterior)`;
    }
}

/* =====================
   CAMPOS CONDICIONALES
   ===================== */
function toggleCronicaInput() {
    const sel = document.getElementById('enfermedades_cronicas_select').value;
    const ta = document.getElementById('enfermedades_cronicas');
    if (sel === 'Sí') {
        ta.style.display = 'block';
        ta.required = true;
    } else {
        ta.style.display = 'none';
        ta.required = false;
        ta.value = sel;
    }
}

function toggleMedicamentosInput() {
    const sel = document.getElementById('medicamentos_select').value;
    const ta = document.getElementById('medicamentos');
    if (sel === 'Sí') {
        ta.style.display = 'block';
        ta.required = true;
    } else {
        ta.style.display = 'none';
        ta.required = false;
        ta.value = sel;
    }
}

/* =====================
   RESUMEN FINAL
   ===================== */
function buildSummary() {
    const nombre = document.getElementById('nombre_completo')?.value || '—';
    const puesto = selectedVacante?.nombre || '—';
    const escolaridad = document.getElementById('escolaridad')?.value || '—';
    const empresa1 = document.getElementById('empresa_1')?.value || 'No especificado';
    const telefono = document.getElementById('telefono')?.value || '—';
    const email = document.getElementById('email')?.value || '—';

    document.getElementById('summaryContent').innerHTML = `
    <div class="summary-item"><span class="summary-label">Candidato</span><span class="summary-value">${nombre}</span></div>
    <div class="summary-item"><span class="summary-label">Vacante</span><span class="summary-value">${puesto}</span></div>
    <div class="summary-item"><span class="summary-label">Escolaridad</span><span class="summary-value">${escolaridad}</span></div>
    <div class="summary-item"><span class="summary-label">Empresa más reciente</span><span class="summary-value">${empresa1}</span></div>
    <div class="summary-item"><span class="summary-label">Teléfono</span><span class="summary-value">${telefono}</span></div>
    <div class="summary-item"><span class="summary-label">Email</span><span class="summary-value">${email}</span></div>
  `;
}

/* =====================
   ENVÍO DEL FORMULARIO
   ===================== */
async function submitForm() {
    if (!validateStep(currentStep)) return;

    const privacyAccepted = syncPrivacyGateState();
    if (!privacyAccepted) {
        showToast('⚠️ Debes aceptar el Aviso de Privacidad para continuar', 'warning');
        return;
    }

    const payload = buildPayload();
    document.getElementById('loadingOverlay').style.display = 'flex';

    try {
        const result = await submitToSupabase(payload);
        const mailResult = await sendSubmissionEmails(payload, result);
        await transferSubmissionData(payload, result, mailResult);
        document.getElementById('loadingOverlay').style.display = 'none';
        showResult(result, payload);
        if (mailResult.ok) {
            showToast('✅ Registro y notificaciones enviadas correctamente.', 'info');
        } else if (!mailResult.attempted) {
            showToast('⚠️ Registro guardado en base de datos, pero el correo no está configurado (EMAIL_WEBHOOK_URL).', 'warning');
        } else if (mailResult.attempted) {
            showToast('⚠️ Registro guardado, pero no se pudo enviar alguna notificación por correo.', 'warning');
        }
    } catch (err) {
        document.getElementById('loadingOverlay').style.display = 'none';
        console.error('Error al enviar:', err);
        emitPostulacionEvent('submission_error', { error: err.message || 'error desconocido' });
        document.getElementById('errorMessage').textContent = err.message || 'Ocurrió un problema. Intenta de nuevo.';
        document.getElementById('errorModal').style.display = 'flex';
    }
}

/* ── Builder del Payload ── */
function buildPayload() {
    const formData = new FormData(document.getElementById('applicationForm'));
    const obj = {};
    formData.forEach((v, k) => { obj[k] = v; });

    // Convertir fecha DD/MM/AAAA a ISO y calcular edad
    if (obj.fecha_nacimiento) {
        const parsed = parseBirthDateDMY(obj.fecha_nacimiento);
        if (parsed.valid) {
            obj.fecha_nacimiento = parsed.iso;
            obj.edad = parsed.edad;
        }
    }

    obj.privacy_accepted = document.getElementById('privacy_accepted')?.value === 'true';
    obj.fuente = 'formulario_web';
    obj.estatus_postulacion = 'RECIBIDA';
    if (!isUuid(obj.id_puesto)) obj.id_puesto = '';
    obj.origen_postulacion = (obj.origen_postulacion || 'ONLINE').toUpperCase();
    obj.detalle_origen_postulacion = obj.detalle_origen_postulacion || '';
    const vinculoSel = document.getElementById('vinculo_interno_select');
    const vinculoDet = document.getElementById('vinculo_interno_detalle');
    obj.declaracion_vinculo_interno = (vinculoSel?.value || 'NO').toUpperCase();
    obj.vinculo_interno_quien = obj.declaracion_vinculo_interno === 'SI'
        ? (vinculoDet?.value || '').trim().toUpperCase()
        : 'NINGUNO DECLARADO';

    // Manejar campos condicionales de salud
    const eSel = document.getElementById('enfermedades_cronicas_select');
    const eDet = document.getElementById('enfermedades_cronicas_detalle');
    const mSel = document.getElementById('medicamentos_select');
    const mDet = document.getElementById('medicamentos_detalle');
    const dSel = document.getElementById('discapacidades_select');
    const dDet = document.getElementById('discapacidad_cuidados');

    obj.enfermedades_cronicas = eSel && eSel.value === 'Si'
        ? (eDet && eDet.value.trim() ? eDet.value.trim() : 'SI, NO ESPECIFICADO')
        : 'NINGUNA';

    obj.medicamentos = mSel && mSel.value === 'Si'
        ? (mDet && mDet.value.trim() ? mDet.value.trim() : 'SI, NO ESPECIFICADO')
        : 'NO';

    obj.discapacidades = dSel ? dSel.value : 'Ninguna';
    if (dSel && dSel.value !== 'Ninguna' && dDet && dDet.value.trim()) {
        obj.discapacidades = `${dSel.value} | CUIDADOS: ${dDet.value.trim()}`;
    }

    return window.MB_UPPERCASE ? window.MB_UPPERCASE.normalizePayload(obj) : obj;
}

/* ── Envío a Supabase ── */
async function submitToSupabase(payload) {
    // Intentar calcular score localmente y enrutar
    const score = calcularScoreLocal(payload);
    const decision = score >= 80 ? 'PROMOTE' : 'ARCHIVE';
    const tabla = decision === 'PROMOTE' ? 'candidatos_activos' : 'prospectos_rechazados';

    // Enriquecer payload con resultado
    const enrichedPayload = {
        ...payload,
        match_score: score,
        decision_agente: {
            decision,
            score,
            reasoning: decision === 'PROMOTE'
                ? `Candidato cumple con los requisitos básicos de la vacante (Score: ${score}%).`
                : `El perfil no cumple con los requisitos mínimos (Score: ${score}%). Se archiva el expediente.`,
            declaracion_vinculo_interno: payload.declaracion_vinculo_interno || 'NO',
            vinculo_interno_quien: payload.vinculo_interno_quien || 'NINGUNO DECLARADO',
            supabase_status: 'PENDING',
            processed_at: new Date().toISOString()
        }
    };

    if (decision === 'ARCHIVE') {
        enrichedPayload.razon_rechazo = enrichedPayload.decision_agente.reasoning;
        enrichedPayload.filtro_fallido = 'score';
    }

    // Remover campos no relevantes para la tabla
    const dbPayload = prepareForDB(enrichedPayload, tabla);

    // Generamos el id en cliente porque el insert anonimo usa return=minimal
    // (RLS no permite SELECT al rol anon, asi que no podemos leer la fila insertada).
    const clientGeneratedId = (window.crypto && typeof window.crypto.randomUUID === 'function')
        ? window.crypto.randomUUID()
        : null;
    if (clientGeneratedId) dbPayload.id = clientGeneratedId;

    await supabasePost(`/rest/v1/${tabla}`, dbPayload);

    // Log de la decisión
    await supabasePost('/rest/v1/log_agente', {
        nombre_candidato: payload.nombre_completo,
        codigo_puesto: payload.codigo_puesto,
        decision,
        score,
        reasoning: enrichedPayload.decision_agente.reasoning,
        input_payload: payload,
        output_payload: enrichedPayload,
        skill_usada: 'hr_multi_job_processor_003',
        supabase_status: 'SUCCESS'
    }).catch(e => console.warn('Log warning:', e));

    return { decision, score, tabla, payload: enrichedPayload, insertedId: clientGeneratedId };
}

/* ── Score Local (mientras el agente IA no está conectado) ── */
function calcularScoreLocal(data) {
    let score = 50; // Base

    // Filtros duros
    if (!data.privacy_accepted) return 0;

    const edad = parseInt(data.edad) || 0;
    const escolaridad = data.escolaridad || '';
    const empresa1 = data.empresa_1 || '';

    // Bonus por escolaridad
    if (escolaridad.includes('Licenciatura') || escolaridad.includes('Ingeniería')) score += 20;
    else if (escolaridad.includes('Técnico') || escolaridad.includes('Preparatoria')) score += 10;

    // Bonus por experiencia
    if (empresa1 && empresa1.trim() !== '') score += 15;
    if (data.empresa_2) score += 5;
    if (data.empresa_3) score += 5;

    // Bonus por datos completos
    if (data.curp && data.rfc) score += 5;

    return Math.min(Math.round(score), 100);
}

/* ─── Preparar payload para BD (limpiar campos extra) ─── */
function prepareForDB(data, tabla) {
    const cleanFields = ['id_puesto', 'codigo_puesto', 'nombre_completo', 'fecha_nacimiento', 'edad', 'genero',
        'curp', 'rfc', 'estado_civil', 'telefono', 'email', 'domicilio', 'colonia', 'municipio', 'estado',
        'escolaridad', 'carrera', 'institucion', 'anio_egreso', 'cedula_profesional',
        'enfermedades_cronicas', 'medicamentos', 'discapacidades', 'tipo_sangre',
        'empresa_1', 'puesto_1', 'antiguedad_1', 'motivo_salida_1', 'jefe_1', 'tel_jefe_1',
        'empresa_2', 'puesto_2', 'antiguedad_2', 'motivo_salida_2', 'jefe_2', 'tel_jefe_2',
        'empresa_3', 'puesto_3', 'antiguedad_3', 'motivo_salida_3', 'jefe_3', 'tel_jefe_3',
        'empresa_4', 'puesto_4', 'antiguedad_4', 'motivo_salida_4', 'jefe_4', 'tel_jefe_4',
        'empresa_5', 'puesto_5', 'antiguedad_5', 'motivo_salida_5', 'jefe_5', 'tel_jefe_5',
        'match_score', 'decision_agente', 'privacy_accepted', 'fuente'];

    if (tabla === 'prospectos_rechazados') {
        cleanFields.push('razon_rechazo', 'filtro_fallido');
    }

    const clean = {};
    cleanFields.forEach(f => { if (data[f] !== undefined && data[f] !== '') clean[f] = data[f]; });
    return clean;
}

/* ── Mostrar Resultado ── */
function showResult(result, payload) {
    const isPromote = result.decision === 'PROMOTE';
    const modal = document.getElementById('successModal');
    const msg = document.getElementById('successMessage');
    const resultDiv = document.getElementById('modalResult');

    msg.textContent = isPromote
        ? `¡Felicidades ${payload.nombre_completo?.split(' ')[0]}! Tu perfil supera los requisitos básicos. Pronto te contactaremos para las siguientes etapas.`
        : `Gracias ${payload.nombre_completo?.split(' ')[0]} por tu interés. En este momento tu perfil no cumple con todos los requisitos de la vacante. Guardaremos tu expediente para futuras oportunidades.`;
    updatePuestoDisplays();

    resultDiv.innerHTML = `
    <div style="text-align:center;">
      <span class="decision-badge ${isPromote ? 'promote' : 'archive'}">
        ${isPromote ? '✅ Pasa a Siguiente Etapa' : '📂 Expediente Archivado'}
      </span>
    </div>
  `;

    lastSubmissionContext = {
        candidateId: result.insertedId || null,
        payload,
        result,
    };
    emitPostulacionEvent('result_ready', {
        candidato_id: result.insertedId || null,
        decision: result.decision,
        score: result.score,
    });
    const calificacionInterna = Number(result?.score || 0) / 10;
    initDocumentUploader(lastSubmissionContext, calificacionInterna);

    const helpLink = document.getElementById('candidateHelpLink');
    if (helpLink) helpLink.style.display = 'none';
    modal.style.display = 'flex';
}

function exitApplicationAfterSubmission() {
    const modal = document.getElementById('successModal');
    if (modal) modal.style.display = 'none';
    emitPostulacionEvent('submission_completed_exit', {
        candidato_id: lastSubmissionContext?.candidateId || null,
    });

    if (isEmbeddedMode()) {
        emitPostulacionEvent('close_requested', {
            candidato_id: lastSubmissionContext?.candidateId || null,
        });
        return;
    }

    try {
        window.open('', '_self');
        window.close();
    } catch (_) {
        // Ignorado: algunos navegadores bloquean cierre de pestaña no abierta por script.
    }

    setTimeout(() => {
        if (!document.hidden) {
            window.location.replace('about:blank');
        }
    }, 120);
}

/* ── Reset ── */
function resetForm() {
    document.getElementById('successModal').style.display = 'none';
    document.getElementById('applicationForm').reset();
    document.getElementById('applicationForm').style.display = 'none';
    document.getElementById('navButtons').style.display = 'none';
    document.getElementById('vacanteSelector').style.display = 'block';
    selectedVacante = null;
    lastSubmissionContext = null;
    currentStep = 0;
    syncPrivacyGateState();
    updateProgress();
    renderVacantesByGate();
    updatePuestoDisplays();
}

function syncPrivacyGateState() {
    const gate = document.getElementById('privacyGate');
    const hidden = document.getElementById('privacy_accepted');
    const accepted = !!(gate && gate.checked);
    if (hidden) hidden.value = accepted ? 'true' : 'false';
    return accepted;
}

function initPrivacyGate() {
    const gate = document.getElementById('privacyGate');
    const hidden = document.getElementById('privacy_accepted');
    if (!gate || !hidden) return;

    syncPrivacyGateState();
    gate.addEventListener('change', () => {
        syncPrivacyGateState();
        renderVacantesByGate();
    });
}

function initOrigenPostulacion() {
    const originSel = document.getElementById('origenPostulacion');
    const detailSel = document.getElementById('detalleOrigenPostulacionTipo');
    const detailOther = document.getElementById('detalleOrigenPostulacionOtro');
    const originHidden = document.getElementById('origen_postulacion');
    const detailHidden = document.getElementById('detalle_origen_postulacion');
    if (!originSel || !originHidden || !detailSel || !detailOther || !detailHidden) return;

    const sync = () => {
        originHidden.value = (originSel.value || 'ONLINE').toUpperCase();
        const detalleTipo = (detailSel.value || 'EMPRESA').toUpperCase();
        detailOther.classList.toggle('hidden', detalleTipo !== 'OTRO');
        detailHidden.value = detalleTipo === 'OTRO'
            ? (detailOther.value || '').trim().toUpperCase()
            : detalleTipo;
    };
    originSel.addEventListener('change', sync);
    detailSel.addEventListener('change', sync);
    detailOther.addEventListener('input', sync);
    sync();
}

function initPublicVacantesLink() {
    const input = document.getElementById('publicVacantesLink');
    const btn = document.getElementById('copyVacantesLinkBtn');
    if (!input || !btn) return;
    input.value = CFG.POSTULACION_PUBLIC_URL || window.location.href.split('?')[0];
    btn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(input.value);
            showToast('✅ Link copiado. Puedes enviarlo por WhatsApp o publicar en web.', 'success');
        } catch (_) {
            input.select();
            document.execCommand('copy');
            showToast('✅ Link copiado.', 'success');
        }
    });
}

function renderVacantesByGate() {
    const grid = document.getElementById('vacantesGrid');
    const gate = document.getElementById('privacyGate');
    if (!grid || !gate) return;
    if (!gate.checked) {
        grid.innerHTML = `
        <div class="col-span-full p-8 rounded-3xl border border-amber-500/30 bg-amber-500/10 text-center space-y-3">
            <p class="text-xs font-black uppercase tracking-widest privacy-required-title">Privacidad requerida</p>
            <p class="text-sm privacy-required-message">Primero acepta el aviso de privacidad para habilitar el listado de vacantes.</p>
        </div>`;
        return;
    }
    grid.innerHTML = cachedVacantesHTML || `
      <div class="col-span-full py-20 flex flex-col items-center gap-4 text-slate-500">
        <div class="spinner"></div>
        <p class="text-xs font-black uppercase tracking-widest">Consultando vacantes activas...</p>
      </div>`;
}

function normalizeText(value, fallback) {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    if (!text) return fallback;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function summarizeVacante(v, template) {
    const raw = String(
        v.descripcion_corta ||
        v.descripcion_resumen ||
        v.descripcion ||
        v.descripcion_completa ||
        template.resumen ||
        'Consulta esta vacante y valida si tu perfil se ajusta a los requisitos.'
    ).replace(/\s+/g, ' ').trim();
    if (!raw) return 'Consulta esta vacante y valida si tu perfil se ajusta a los requisitos.';
    const cleaned = cleanVacanteDescription(raw);
    const sentence = cleaned.split(/[.!?]\s+/)[0].trim();
    const summary = sentence.length >= 70 ? sentence : cleaned.slice(0, 170).trim();
    return summary.endsWith('.') ? summary : `${summary}.`;
}

function formatExperiencia(anios, fallback) {
    const n = Number(anios);
    if (Number.isFinite(n) && n >= 0) {
        if (n === 0) return 'Sin experiencia';
        return `${n} año${n > 1 ? 's' : ''} de experiencia`;
    }
    return fallback;
}

function formatEdad(min, max, fallback) {
    const a = Number(min);
    const b = Number(max);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b >= a) return `${a}-${b} años`;
    if (Number.isFinite(a) && a > 0) return `Desde ${a} años`;
    return fallback;
}

function departamentoIcon(departamento) {
    const iconMap = {
        'Calidad e Inocuidad': '🧪',
        'Logística y Almacén': '📦',
        'Producción': '⚙️',
        'Ventas': '💼',
        'Administración': '📊',
    };
    return iconMap[departamento] || '💼';
}

function puestoIcon(codigo, departamento, nombre) {
    const codeMap = {
        'QC-001': '🧪',
        'ALM-001': '📦',
        'MIX-001': '⚙️',
        'ADM-001': '📊',
        'VEN-001': '🛍️',
    };
    if (codeMap[codigo]) return codeMap[codigo];
    const txt = `${departamento} ${nombre}`.toLowerCase();
    if (txt.includes('diseño') || txt.includes('marketing')) return '🎨';
    if (txt.includes('sistemas') || txt.includes('redes') || txt.includes('tecnico')) return '💻';
    if (txt.includes('investigación') || txt.includes('desarrollo')) return '🔬';
    if (txt.includes('ventas')) return '🛍️';
    if (txt.includes('almac')) return '📦';
    if (txt.includes('produccion')) return '⚙️';
    return departamentoIcon(departamento);
}

function cleanVacanteDescription(raw) {
    let text = String(raw || '').replace(/[\r\n]+/g, '. ');
    const marker = text.search(/(descripci[oó]n del puesto|objetivo del puesto|perfil de puesto|funciones principales|responsabilidades)/i);
    if (marker > 0 && marker < 180) text = text.slice(marker);
    text = text
        .replace(/nombre del puesto\s*:/ig, ' ')
        .replace(/área\s*:/ig, ' ')
        .replace(/departamento\s*:/ig, ' ')
        .replace(/ubicaci[oó]n\s*:/ig, ' ')
        .replace(/reporta a\s*:/ig, ' ')
        .replace(/jefe directo\s*:/ig, ' ')
        .replace(/objetivo( del puesto)?\s*:/ig, ' ')
        .replace(/perfil de puesto\s*:/ig, ' ')
        .replace(/descripción del puesto\s*:/ig, ' ')
        .replace(/funciones principales\s*:/ig, ' ')
        .replace(/responsabilidades\s*:/ig, ' ')
        .replace(/horario laboral\s*:/ig, ' ')
        .replace(/sueldo\s*:/ig, ' ')
        .replace(/prestaciones\s*:/ig, ' ')
        .replace(/sexo\s*:/ig, ' ')
        .replace(/edad\s*:/ig, ' ')
        .replace(/experiencia\s*:/ig, ' ')
        .replace(/escolaridad\s*:/ig, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    text = text.split(/\b(escolaridad|experiencia|edad|sexo|horario|sueldo|prestaciones)\b/i)[0].trim();
    text = text.replace(/^[,;:. -]+/, '').trim();
    // Si hay texto demasiado largo, nos quedamos con la parte más útil inicial.
    if (text.length > 240) text = text.slice(0, 240).trim();
    return text;
}

function cleanPuestoNombre(raw) {
    let name = String(raw || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    const marker = name.search(/(nombre del puesto|puesto:)/i);
    if (marker >= 0) name = name.slice(marker);
    name = name
        .replace(/nombre del puesto\s*:?/ig, '')
        .replace(/puesto\s*:?/ig, '')
        .replace(/área\s*:?/ig, '')
        .replace(/departamento\s*:?/ig, '')
        .replace(/reporta a\s*:?/ig, '')
        .replace(/jefe directo\s*:?/ig, '')
        .replace(/ubicaci[oó]n\s*:?/ig, '')
        .replace(/\s+/g, ' ')
        .trim();
    name = name.split(/\b(objetivo|perfil|descripci[oó]n|funciones|responsabilidades)\b/i)[0].trim();
    name = name.replace(/^[,;:. -]+/, '').trim();
    if (!name) return 'VACANTE DISPONIBLE';
    if (name.length > 80) name = name.slice(0, 80).trim();
    return name;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function jsSafe(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function updatePuestoDisplays() {
    const label = selectedVacante
        ? `${selectedVacante.nombre || 'VACANTE'}${selectedVacante.codigo ? ` (${selectedVacante.codigo})` : ''}`
        : '—';
    const main = document.getElementById('puestoSeleccionadoTexto');
    const loading = document.getElementById('loadingPuestoTexto');
    const success = document.getElementById('successPuestoTexto');
    if (main) main.textContent = label;
    if (loading) loading.textContent = label !== '—' ? `VACANTE: ${label}` : '';
    if (success) success.textContent = label !== '—' ? `POSTULACIÓN: ${label}` : '';
}

function initBirthDateMask() {
    const input = document.querySelector('input[name="fecha_nacimiento"]');
    if (!input) return;
    input.setAttribute('maxlength', '10');
    input.setAttribute('placeholder', 'DD/MM/AAAA');
    input.addEventListener('input', () => {
        const digits = (input.value || '').replace(/\D/g, '').slice(0, 8);
        let out = '';
        if (digits.length > 0) out += digits.slice(0, 2);
        if (digits.length >= 3) out += '/' + digits.slice(2, 4);
        else if (digits.length > 2) out += '/' + digits.slice(2);
        if (digits.length >= 5) out += '/' + digits.slice(4, 8);
        input.value = out;
    });
}

function initHealthConditionals() {
    const eSel = document.getElementById('enfermedades_cronicas_select');
    const eDet = document.getElementById('enfermedades_cronicas_detalle');
    const mSel = document.getElementById('medicamentos_select');
    const mDet = document.getElementById('medicamentos_detalle');
    const dSel = document.getElementById('discapacidades_select');
    const dWrap = document.getElementById('discapacidad_cuidados_wrap');

    const sync = () => {
        if (eSel && eDet) eDet.classList.toggle('hidden', eSel.value !== 'Si');
        if (mSel && mDet) mDet.classList.toggle('hidden', mSel.value !== 'Si');
        if (dSel && dWrap) dWrap.classList.toggle('hidden', dSel.value === 'Ninguna');
    };

    if (eSel) eSel.addEventListener('change', sync);
    if (mSel) mSel.addEventListener('change', sync);
    if (dSel) dSel.addEventListener('change', sync);
    sync();
}

function initVinculoInternoConditionals() {
    const sel = document.getElementById('vinculo_interno_select');
    const det = document.getElementById('vinculo_interno_detalle');
    if (!sel || !det) return;
    const sync = () => det.classList.toggle('hidden', sel.value !== 'SI');
    sel.addEventListener('change', sync);
    sync();
}

function parseBirthDateDMY(value) {
    const m = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return { valid: false };
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (year < 1900 || year > new Date().getFullYear()) return { valid: false };
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== (month - 1) || d.getUTCDate() !== day) return { valid: false };
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const now = new Date();
    let edad = now.getFullYear() - year;
    const beforeBirthday = (now.getMonth() + 1 < month) || ((now.getMonth() + 1 === month) && now.getDate() < day);
    if (beforeBirthday) edad -= 1;
    return { valid: true, iso, edad };
}

async function sendSubmissionEmails(payload, result) {
    if (!EMAIL_WEBHOOK_URL) return { attempted: false, ok: false };

    const candidatoNombre = payload.nombre_completo || 'CANDIDATO';
    const puesto = selectedVacante?.nombre || payload.codigo_puesto || 'VACANTE';
    const origen = payload.origen_postulacion || 'ONLINE';
    const detalleOrigen = payload.detalle_origen_postulacion ? ` (${payload.detalle_origen_postulacion})` : '';
    const calificacion10 = (Number(result?.score || 0) / 10).toFixed(1);
    const resultadoTexto = result?.decision === 'PROMOTE'
        ? 'AVANZAS A LA SIGUIENTE ETAPA'
        : 'TU PERFIL QUEDA EN BOLSA DE TRABAJO';
    const resultadoDetalle = result?.decision === 'PROMOTE'
        ? 'Tu perfil cumple los requisitos iniciales de la vacante.'
        : 'Por el momento tu perfil no cumple todos los requisitos de esta vacante.';
    const recruiterSummary = buildRecruiterSummary(payload, result, puesto);

    const candidateTo = (CANDIDATE_RESULT_EMAIL_OVERRIDE || payload.email || '').trim();
    const candidateMessages = candidateTo ? [{
        to: candidateTo,
        subject: `${COMPANY_NAME} - Gracias por tu postulación`,
        text: `Hola ${candidatoNombre},\n\nGracias por postularte a la vacante "${puesto}".\n\nResultado de tu postulación:\n- Estado: ${resultadoTexto}\n- Calificación interna: ${calificacion10}/10\n- Detalle: ${resultadoDetalle}\n\nModalidad de registro: ${origen}${detalleOrigen}\n\nNuestro equipo de Reclutamiento y Selección dará seguimiento a tu proceso.\n\nAtentamente,\n${COMPANY_NAME}`,
        meta: {
            tipo: 'candidato_confirmacion',
            codigo_puesto: payload.codigo_puesto || '',
            origen_postulacion: origen,
            original_candidate_email: payload.email || '',
            decision: result?.decision || '',
            score: result?.score ?? null,
        },
    }] : [];

    const recruiterMessages = RECRUITER_EMAILS
        .filter(Boolean)
        .map((to) => ({
            to,
            subject: `Nueva postulación recibida: ${puesto}`,
            text: recruiterSummary,
            meta: {
                tipo: 'reclutador_nueva_postulacion',
                codigo_puesto: payload.codigo_puesto || '',
                decision: result?.decision || '',
                score: result?.score ?? null,
            },
        }));

    const messages = [...candidateMessages, ...recruiterMessages];
    if (!messages.length) return { attempted: false, ok: false };
    let ok = true;

    for (const msg of messages) {
        try {
            const r = await fetch(EMAIL_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(msg),
            });
            if (!r.ok) ok = false;
        } catch {
            ok = false;
        }
    }

    return { attempted: true, ok };
}

function buildRecruiterSummary(payload, result, puesto) {
    const calificacion10 = (Number(result?.score || 0) / 10).toFixed(1);
    const lines = [
        `POSTULACION NUEVA - ${COMPANY_NAME}`,
        `FECHA: ${new Date().toLocaleString('es-MX')}`,
        '',
        `CANDIDATO: ${payload.nombre_completo || '-'}`,
        `EMAIL: ${payload.email || '-'}`,
        `TELEFONO: ${payload.telefono || '-'}`,
        `VACANTE: ${puesto}`,
        `CODIGO PUESTO: ${payload.codigo_puesto || '-'}`,
        `ORIGEN: ${payload.origen_postulacion || 'ONLINE'}${payload.detalle_origen_postulacion ? ` (${payload.detalle_origen_postulacion})` : ''}`,
        `ESTATUS: ${payload.estatus_postulacion || 'RECIBIDA'}`,
        `DECLARACION VINCULO INTERNO: ${payload.declaracion_vinculo_interno || 'NO'}`,
        `VINCULO DECLARADO (QUIEN): ${payload.vinculo_interno_quien || 'NINGUNO DECLARADO'}`,
        '',
        `SCORE INTERNO (0-100): ${result?.score ?? '-'}`,
        `CALIFICACION INTERNA (0-10): ${calificacion10}`,
        `DECISION AGENTE: ${result?.decision || '-'}`,
        '',
        'RESUMEN DE PERFIL:',
        `- ESCOLARIDAD: ${payload.escolaridad || '-'}`,
        `- EXPERIENCIA RECIENTE: ${payload.empresa_1 || '-'} / ${payload.puesto_1 || '-'}`,
        `- EDAD: ${payload.edad || '-'}`,
        `- MUNICIPIO: ${payload.domicilio_municipio || payload.municipio || '-'}`,
        '',
        'DATOS COMPLETOS (JSON):',
        JSON.stringify(payload, null, 2),
    ];
    return lines.join('\n');
}

/* =====================
   HELPERS SUPABASE
   ===================== */
async function supabaseGet(path) {
    const resp = await fetch(`${SUPABASE_URL}${path}`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${resp.status}`);
    }
    return resp.json();
}

async function supabasePost(path, body) {
    const resp = await fetch(`${SUPABASE_URL}${path}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            // return=minimal: el rol anon solo tiene politica INSERT (sin SELECT),
            // y return=representation exige SELECT sobre la fila insertada (falla RLS).
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(body)
    });
    if (!resp.ok && resp.status !== 201) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `Error ${resp.status}: No se pudo guardar el registro`);
    }
    return resp.json().catch(() => []);
}

/* ── Toast Notification ── */
function showToast(msg, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    toast.style.cssText = `
    position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
    background: ${type === 'warning' ? '#F59E0B' : '#1A2744'};
    color: white; padding: 12px 20px; border-radius: 50px;
    font-size: 14px; font-weight: 600; z-index: 500;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    animation: slideUp 0.3s ease;
    max-width: calc(100vw - 40px);
    text-align: center;
  `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function initDocumentUploader(ctx, calificacionInterna = 0) {
    const wrap = document.getElementById('docUploadSection');
    const list = document.getElementById('docUploadList');
    const listWrap = document.getElementById('docUploadListWrap');
    const btnYes = document.getElementById('docFlowAcceptBtn');
    const btnNo = document.getElementById('docFlowSkipBtn');
    const notice = document.getElementById('docFlowNotice');
    const consent = document.getElementById('docsPrivacyConsent');
    if (!wrap || !list || !listWrap || !btnYes || !btnNo || !notice || !consent) return;

    const promoted = (ctx?.result?.decision === 'PROMOTE') || (calificacionInterna >= 8);
    if (!promoted) {
        wrap.classList.add('hidden');
        list.innerHTML = '';
        listWrap.classList.add('hidden');
        return;
    }

    wrap.classList.remove('hidden');
    listWrap.classList.add('hidden');
    notice.textContent = '';
    const docs = [
        { key: 'ine', name: 'INE (frente y reverso)' },
        { key: 'comprobante_domicilio', name: 'Comprobante de domicilio' },
        { key: 'certificado_estudios', name: 'Certificado o constancia de estudios' },
        { key: 'solicitud_empleo', name: 'Solicitud de empleo escaneada' },
        { key: 'curp', name: 'CURP' },
        { key: 'rfc', name: 'RFC / Constancia fiscal' },
        { key: 'nss_imss', name: 'Número de seguridad social / IMSS' },
        { key: 'acta_nacimiento', name: 'Acta de nacimiento' },
        { key: 'otro', name: 'Otro documento requerido por RRHH' },
    ];

    list.innerHTML = docs.map((d, idx) => `
      <div class="doc-uploader-row" data-doc="${d.key}">
        <div>
          <div class="doc-name">${idx + 1}. ${escapeHtml(d.name)}</div>
          <div id="doc-status-${d.key}" class="doc-status">Pendiente</div>
        </div>
        <input id="doc-file-${d.key}" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" class="text-xs">
        <button type="button" class="doc-action" onclick="uploadCandidateDocument('${d.key}')">Subir</button>
      </div>
    `).join('');

    btnYes.onclick = () => {
        if (!consent.checked) {
            showToast('⚠️ Acepta primero el aviso de privacidad documental.', 'warning');
            return;
        }
        notice.textContent = 'Puedes empezar a escanear y subir documentos. Se almacenan de forma segura para revisión de RRHH.';
        listWrap.classList.remove('hidden');
    };
    btnNo.onclick = () => {
        listWrap.classList.add('hidden');
        notice.textContent = 'Sin problema. Al asistir a la empresa deberás presentar documentos originales y credenciales vigentes; de lo contrario, el proceso podría cancelarse en sitio.';
    };
}

async function uploadCandidateDocument(docKey) {
    if (!lastSubmissionContext) return;
    const docsConsent = document.getElementById('docsPrivacyConsent');
    if (!docsConsent || !docsConsent.checked) {
        showToast('⚠️ Debes aceptar el aviso de privacidad documental antes de subir archivos.', 'warning');
        return;
    }
    const statusEl = document.getElementById(`doc-status-${docKey}`);
    const fileEl = document.getElementById(`doc-file-${docKey}`);
    const file = fileEl?.files?.[0];
    if (!file) {
        showToast('⚠️ Selecciona un archivo antes de subir.', 'warning');
        return;
    }
    if (!DOCUMENT_UPLOAD_WEBHOOK_URL) {
        showToast('⚠️ Falta configurar DOCUMENT_UPLOAD_WEBHOOK_URL.', 'warning');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showToast('⚠️ El archivo supera 10MB. Reduce el tamaño.', 'warning');
        return;
    }

    if (statusEl) statusEl.textContent = 'Subiendo...';
    try {
        const base64 = await fileToBase64(file);
        const body = {
            documentType: docKey,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64,
            candidateId: lastSubmissionContext.candidateId,
            candidateEmail: lastSubmissionContext.payload?.email || '',
            candidateName: lastSubmissionContext.payload?.nombre_completo || '',
            puestoCodigo: lastSubmissionContext.payload?.codigo_puesto || '',
            origenPostulacion: lastSubmissionContext.payload?.origen_postulacion || '',
            consentimientoDocumental: true,
        };
        const r = await fetch(DOCUMENT_UPLOAD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data?.ok) throw new Error(data?.error || `Error ${r.status}`);
        if (statusEl) statusEl.textContent = 'Subido y validado';
        emitPostulacionEvent('document_uploaded', {
            candidato_id: lastSubmissionContext?.candidateId || null,
            tipo_documento: docKey,
            nombre_archivo: file.name,
        });
        showToast('✅ Documento cargado correctamente.', 'success');
    } catch (e) {
        if (statusEl) statusEl.textContent = 'Error de carga';
        emitPostulacionEvent('document_upload_error', {
            candidato_id: lastSubmissionContext?.candidateId || null,
            tipo_documento: docKey,
            error: e.message || 'error desconocido',
        });
        showToast(`⚠️ No se pudo subir: ${e.message || 'error desconocido'}`, 'warning');
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => {
            const out = String(fr.result || '');
            const comma = out.indexOf(',');
            resolve(comma >= 0 ? out.slice(comma + 1) : out);
        };
        fr.onerror = reject;
        fr.readAsDataURL(file);
    });
}
