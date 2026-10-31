/* ==========================================
   Ma Baker & Chef — App JavaScript
   Lógica: navegación, validación, Supabase
   ========================================== */

const SUPABASE_URL = 'https://znskpdixdyxdbvpapqrg.supabase.co';
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || '';

/* ── Estado de la App ── */
let currentStep = 0;
const TOTAL_STEPS = 5;
let selectedVacante = null;

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
    await loadVacantes();
});

/* =====================
   CARGA DE VACANTES
   ===================== */
async function loadVacantes() {
    const grid = document.getElementById('vacantesGrid');
    try {
        const resp = await supabaseGet('/rest/v1/catalogo_puestos?select=*&activo=eq.true&order=nombre_puesto.asc');

        if (!resp || resp.length === 0) {
            // Vacantes fallback si la tabla aún no tiene datos
            grid.innerHTML = renderVacanteFallback();
            return;
        }
        grid.innerHTML = resp.map(v => renderVacanteCard(v)).join('');
    } catch (err) {
        console.error('Error cargando vacantes:', err);
        grid.innerHTML = renderVacanteFallback();
    }
}

function renderVacanteCard(v) {
    const iconMap = { 'Calidad e Inocuidad': '🧪', 'Logística y Almacén': '📦', 'Producción': '⚙️', 'Ventas': '💰', 'Administración': '📊' };
    const icon = iconMap[v.departamento] || '💼';
    return `
    <div class="vacante-card" onclick="selectVacante('${v.id}', '${v.codigo_puesto}', '${v.nombre_puesto}')">
      <div class="vacante-icon">${icon}</div>
      <div class="vacante-info">
        <div class="vacante-nombre">${v.nombre_puesto}</div>
        <div class="vacante-depto">${v.departamento}</div>
        <div class="vacante-badges">
          <span class="badge">${v.escolaridad_minima.charAt(0).toUpperCase() + v.escolaridad_minima.slice(1)}</span>
          <span class="badge gold">${v.experiencia_minima_anios > 0 ? v.experiencia_minima_anios + ' año(s) exp.' : 'Sin experiencia'}</span>
          <span class="badge">${v.edad_minima}-${v.edad_maxima} años</span>
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
    <div class="vacante-card" onclick="selectVacante('${v.id}', '${v.codigo}', '${v.nombre}')">
      <div class="vacante-icon">${v.icon}</div>
      <div class="vacante-info">
        <div class="vacante-nombre">${v.nombre}</div>
        <div class="vacante-depto">${v.depto}</div>
        <div class="vacante-badges">
          <span class="badge">${v.escolaridad}</span>
          <span class="badge gold">${v.exp}</span>
          <span class="badge">${v.edad}</span>
        </div>
      </div>
      <div class="vacante-arrow">→</div>
    </div>
  `).join('');
}

function selectVacante(id, codigo, nombre) {
    selectedVacante = { id, codigo, nombre };
    document.getElementById('id_puesto').value = id;
    document.getElementById('codigo_puesto').value = codigo;

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

    const privacyCheck = document.getElementById('privacy_accepted');
    if (!privacyCheck.checked) {
        showToast('⚠️ Debes aceptar el Aviso de Privacidad para continuar', 'warning');
        return;
    }

    const payload = buildPayload();
    document.getElementById('loadingOverlay').style.display = 'flex';

    try {
        const result = await submitToSupabase(payload);
        document.getElementById('loadingOverlay').style.display = 'none';
        showResult(result, payload);
    } catch (err) {
        document.getElementById('loadingOverlay').style.display = 'none';
        console.error('Error al enviar:', err);
        document.getElementById('errorMessage').textContent = err.message || 'Ocurrió un problema. Intenta de nuevo.';
        document.getElementById('errorModal').style.display = 'flex';
    }
}

/* ── Builder del Payload ── */
function buildPayload() {
    const formData = new FormData(document.getElementById('applicationForm'));
    const obj = {};
    formData.forEach((v, k) => { obj[k] = v; });

    // Calcular edad
    if (obj.fecha_nacimiento) {
        const birth = new Date(obj.fecha_nacimiento);
        const today = new Date();
        obj.edad = today.getFullYear() - birth.getFullYear() -
            (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
    }

    obj.privacy_accepted = document.getElementById('privacy_accepted').checked;
    obj.fuente = 'formulario_web';

    // Manejar campos condicionales de salud
    if (!obj.enfermedades_cronicas) obj.enfermedades_cronicas = document.getElementById('enfermedades_cronicas_select').value;
    if (!obj.medicamentos) obj.medicamentos = document.getElementById('medicamentos_select').value;

    return obj;
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

    const resp = await supabasePost(`/rest/v1/${tabla}`, dbPayload);

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

    return { decision, score, tabla, payload: enrichedPayload };
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

    resultDiv.innerHTML = `
    <div style="text-align:center; margin-bottom: 10px;">
      <div class="score-display">${result.score}%</div>
      <div>Compatibilidad con la vacante</div>
    </div>
    <div style="text-align:center;">
      <span class="decision-badge ${isPromote ? 'promote' : 'archive'}">
        ${isPromote ? '✅ Pasa a Siguiente Etapa' : '📂 Expediente Archivado'}
      </span>
    </div>
  `;

    modal.style.display = 'flex';
}

/* ── Reset ── */
function resetForm() {
    document.getElementById('successModal').style.display = 'none';
    document.getElementById('applicationForm').reset();
    document.getElementById('applicationForm').style.display = 'none';
    document.getElementById('navButtons').style.display = 'none';
    document.getElementById('vacanteSelector').style.display = 'block';
    selectedVacante = null;
    currentStep = 0;
    updateProgress();
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
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(body)
    });
    if (!resp.ok && resp.status !== 201) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `Error ${resp.status}: No se pudo guardar el registro`);
    }
    return resp;
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
