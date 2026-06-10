/**
 * dashboard.js - controlador unificado de dashboards (RRHH/Admin/Jefe/Medico)
 */

(function () {
  const CFG = window.MB_CONFIG || {};
  const SUPA_URL = CFG.SUPABASE_URL || "";
  const SUPA_KEY = CFG.SUPABASE_ANON_KEY || "";
  const esc = CFG.escapeHTML || ((v) => String(v ?? ""));

  const HEADERS = {
    apikey: SUPA_KEY,
    Authorization: `Bearer ${SUPA_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  const CANDIDATE_PUBLIC_SELECT = "id,created_at,nombre_completo,nombre,email,correo,telefono,edad,genero,fase_actual,id_puesto,nombre_puesto,puesto,codigo_puesto,departamento,escolaridad,empresa_1,empresa_2,empresa_3,empresa_4,empresa_5,puesto_1,puesto_2,puesto_3,puesto_4,puesto_5,antiguedad_1,antiguedad_2,antiguedad_3,antiguedad_4,antiguedad_5,motivo_salida_1,motivo_salida_2,motivo_salida_3,motivo_salida_4,motivo_salida_5,curp,rfc,domicilio,cedula_profesional,nivel_socioeconomico,decision_agente,match_score,veredicto_jefe,estatus_postulacion,origen_postulacion,detalle_origen_postulacion";
  const CANDIDATOS_NON_MEDICAL_ENDPOINT = `/rest/v1/candidatos_activos?select=${CANDIDATE_PUBLIC_SELECT}&order=created_at.desc`;
  const CANDIDATOS_MEDICAL_ENDPOINT = "/rest/v1/candidatos_activos?select=*&order=created_at.desc";
  const MEDICAL_FIELDS = [
    "enfermedades_cronicas",
    "medicamentos",
    "discapacidades",
    "tipo_sangre",
    "alergias",
    "dictamen_medico",
    "resultado_medico",
    "recomendaciones_medicas",
    "observaciones_medicas",
  ];

  const state = {
    role: null,
    resources: [],
    datasets: {},
    filteredCandidates: null,
    vacanteFilter: "todas",
    currentVacanteId: null,
    currentCandidatoId: null,
  };

  function sessionFromStorage() {
    const legacy = JSON.parse(localStorage.getItem("mabaker_session") || "null");
    const modern = {
      id: localStorage.getItem("mb_token"),
      rol: localStorage.getItem("mb_rol"),
      nombre: localStorage.getItem("mb_nombre"),
      departamento: localStorage.getItem("mb_departamento"),
    };
    return legacy && legacy.id ? legacy : modern;
  }

  function requireSession() {
    const s = sessionFromStorage();
    if (!s || !s.id) {
      window.location.href = "login.html";
      return null;
    }
    return s;
  }

  async function supaGet(endpoint) {
    console.log("🌐 supaGet starting: " + endpoint);
    try {
      const r = await fetch(`${SUPA_URL}${endpoint}`, { headers: HEADERS });
      if (!r.ok) throw new Error(`GET ${endpoint} -> ${r.status}`);
      const data = await r.json();
      console.log("🌐 supaGet successful: " + endpoint + " (" + (data ? data.length : 0) + " items)");
      return data;
    } catch (e) {
      console.error("🌐 supaGet failed: " + endpoint, e);
      throw e;
    }
  }

  async function supaPatch(endpoint, body) {
    const r = await fetch(`${SUPA_URL}${endpoint}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`PATCH ${endpoint} -> ${r.status}`);
    return r.json();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  function candidateEndpointForRole(role) {
    return role === "medico" ? CANDIDATOS_MEDICAL_ENDPOINT : CANDIDATOS_NON_MEDICAL_ENDPOINT;
  }

  function removeMedicalFieldsFromCandidate(candidate) {
    if (!candidate || typeof candidate !== "object") return candidate;
    const clean = { ...candidate };
    MEDICAL_FIELDS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(clean, key)) {
        delete clean[key];
      }
    });
    return clean;
  }

  function fmtDate(v) {
    if (!v) return "-";
    try {
      return new Date(v).toLocaleString("es-MX");
    } catch {
      return "-";
    }
  }

  function fmtMoney(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "-";
    return Number(v).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  }

  function resolveCandidateName(c) {
    return c.nombre_completo || c.nombre || "Sin nombre";
  }

  function resolveCandidateEmail(c) {
    return c.email || c.correo || "-";
  }

  function resolveJobName(x) {
    return x.nombre_puesto || x.puesto || x.codigo_puesto || "-";
  }

  function getWorkExperiences(c) {
    const fromDecision = Array.isArray(c?.decision_agente?.experiencia_laboral)
      ? c.decision_agente.experiencia_laboral
      : [];
    const normalized = fromDecision
      .map((item, idx) => ({
        orden: item.orden || idx + 1,
        empresa: String(item.empresa || "").trim(),
        puesto: String(item.puesto || "").trim(),
        inicio: String(item.inicio_mes_anio || item.inicio || "").trim(),
        termino: String(item.termino_mes_anio || item.termino || "").trim(),
        motivo: String(item.motivo_salida || "").trim(),
      }))
      .filter((x) => x.empresa || x.puesto || x.inicio || x.termino || x.motivo);
    if (normalized.length > 0) return normalized;

    const legacy = [];
    for (let i = 1; i <= 4; i++) {
      const empresa = String(c[`empresa_${i}`] || "").trim();
      const puesto = String(c[`puesto_${i}`] || "").trim();
      const periodo = String(c[`antiguedad_${i}`] || "").trim();
      const motivo = String(c[`motivo_salida_${i}`] || "").trim();
      if (!empresa && !puesto && !periodo && !motivo) continue;
      legacy.push({
        orden: i,
        empresa,
        puesto,
        inicio: periodo,
        termino: "",
        motivo,
      });
    }
    return legacy;
  }

  function formatWorkExperiencesText(c) {
    const items = getWorkExperiences(c);
    if (!items.length) return "SIN EXPERIENCIA REGISTRADA";
    return items
      .map((x) => {
        const periodo = x.termino ? `${x.inicio || "N/A"} A ${x.termino}` : (x.inicio || "N/A");
        return `${x.orden}) ${x.empresa || "EMPRESA"} | ${x.puesto || "PUESTO"} | ${periodo}`;
      })
      .join("\n");
  }

  function summarizeCompanies(c) {
    const names = getWorkExperiences(c)
      .map((x) => x.empresa)
      .filter(Boolean);
    if (!names.length) return "—";
    return names.slice(0, 4).join(" | ");
  }

  function bindGlobalUI() {
    const searchInput = byId("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const term = searchInput.value.trim().toLowerCase();
        const all = state.datasets.candidatos || [];
        state.filteredCandidates = !term
          ? null
          : all.filter((c) =>
              [resolveCandidateName(c), resolveCandidateEmail(c), resolveJobName(c)]
                .join(" ")
                .toLowerCase()
                .includes(term)
            );
        renderRRHHTables();
      });
    }

    const navItems = document.querySelectorAll(".nav-item[data-panel]");
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        activarPanel(item.dataset.panel, item);
      });
    });
  }

  function panelTitle(panel) {
    const map = {
      dashboard: "Gestión de Talento",
      candidatos: "Candidatos Activos",
      vacantes: "Catálogo de Puestos",
      rechazados: "Historial de Rechazos",
      logs: "Logs del Sistema",
      pendientes: "Pendientes",
      evaluados: "Evaluados",
      alertas: "Alertas",
    };
    return map[panel] || "Dashboard";
  }

  function activarPanel(panel, source) {
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    const target = byId(`panel-${panel}`);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-item[data-panel]").forEach((n) => n.classList.remove("nav-item-active", "active"));
    if (source) source.classList.add("nav-item-active", "active");

    setText("panelTitle", panelTitle(panel));
  }

  async function initDashboard(role, resources) {
    console.log("🚀 initDashboard starting: role=" + role);
    state.role = role;
    state.resources = Array.isArray(resources) ? resources : [];
    const s = requireSession();
    if (!s) {
      console.warn("🚀 initDashboard: session not found");
      return;
    }

    hydrateUser(s);
    bindGlobalUI();

    if (role === "rrhh" || role === "admin") {
      console.log("🚀 initDashboard: loading RRHH/Admin resources (" + resources.length + ")");
      return loadRRHH(resources || []);
    }
    if (role === "jefe") return loadJefe(s);
    if (role === "medico") return loadMedico();
  }

  function hydrateUser(s) {
    const userInfo = byId("userInfo") || byId("sidebarProfile");
    if (!userInfo) return;
    const nombre = esc(s.nombre || "Usuario");
    const rol = esc((s.rol || "").toUpperCase());
    userInfo.innerHTML = `<span class="user-name">${nombre}</span><span class="user-rol">${rol}</span>`;
  }

  async function loadRRHH(resources) {
    console.log("📋 loadRRHH: starting...");
    const map = {};
    await Promise.all(
      resources.map(async (r) => {
        try {
          let endpoint = r.endpoint;
          if (r.id === "candidatos") endpoint = candidateEndpointForRole(state.role);
          const data = await supaGet(endpoint);
          map[r.id] = r.id === "candidatos"
            ? data.map((c) => removeMedicalFieldsFromCandidate(c))
            : data;
        } catch (e) {
          console.error("📋 loadRRHH: failed for " + r.id, e);
          map[r.id] = [];
        }
      })
    );
    state.datasets = map;
    console.log("📋 loadRRHH: data loaded, rendering stats and tables...");
    renderRRHHStats();
    renderRRHHTables();
    console.log("📋 loadRRHH: rendering completed!");
  }

  async function reloadCurrentRoleData() {
    if (state.role === "rrhh" || state.role === "admin") {
      await loadRRHH(state.resources || []);
    }
  }

  function rrhhCandidates() {
    return state.filteredCandidates || state.datasets.candidatos || [];
  }

  function renderRRHHStats() {
    const c = state.datasets.candidatos || [];
    const v = state.datasets.vacantes || [];
    const r = state.datasets.rechazados || [];
    setText("statCandidatos", c.length);
    setText("statPsico", c.filter((x) => (x.fase_actual || "").includes("psico")).length);
    setText("statVacantesActivas", v.filter((x) => x.activo !== false).length);
    setText("statRechazados", r.length);
  }

  function setVacanteFilter(filter) {
    state.vacanteFilter = filter || "todas";
    renderRRHHTables();
  }

  function renderRRHHTables() {
    const c = rrhhCandidates();
    const v = state.datasets.vacantes || [];
    const r = state.datasets.rechazados || [];
    const l = state.datasets.logs || [];

    const cRows = c
      .map((x) => {
        const id = esc(x.id || "");
        const name = esc(resolveCandidateName(x));
        const email = esc(resolveCandidateEmail(x));
        const tel = esc(x.telefono || "-");
        const job = esc(resolveJobName(x));
        const companySummary = esc(summarizeCompanies(x));
        
        // Fase badge mapping
        const phase = (x.fase_actual || "registro").toLowerCase();
        let phaseLabel = "Registro";
        let phaseClass = "bg-slate-500/10 text-slate-400 border border-slate-500/20";
        
        if (phase === 'espera_psicometricos') {
            phaseLabel = "Espera Psicométricos";
            phaseClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse";
        } else if (phase === 'psicometricos_realizados') {
            phaseLabel = "Psicométricos Listos";
            phaseClass = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
        } else if (phase === 'espera_medico') {
            phaseLabel = "Espera Médico";
            phaseClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        } else if (phase === 'espera_jefe') {
            phaseLabel = "Espera Jefe (Téc)";
            phaseClass = "bg-orange-500/10 text-orange-400 border border-orange-500/20";
        } else if (phase === 'induccion_sgi') {
            phaseLabel = "Inducción SGI";
            phaseClass = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
        } else if (phase === 'induccion_seguridad') {
            phaseLabel = "Inducción Seguridad";
            phaseClass = "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
        } else if (phase === 'listo_para_contrato') {
            phaseLabel = "Listo Contrato";
            phaseClass = "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20";
        } else if (phase === 'contratado') {
            phaseLabel = "Contratado";
            phaseClass = "bg-green-500/10 text-green-400 border border-green-500/20 font-black";
        } else if (phase.includes('rechaz')) {
            phaseLabel = "Rechazado";
            phaseClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
        }
        
        const score = x.score_ia || x.score || null;
        let scoreHTML = '<span class="text-slate-500 text-xs">—</span>';
        if (score !== null) {
            const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400';
            scoreHTML = `<span class="font-black text-base ${scoreColor}">${score}</span><span class="text-[10px] text-slate-500">/100</span>`;
        }
        
        const initials = name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || "?";
        
        // Buttons
        let psicoBtn = '';
        if (phase === 'espera_psicometricos' || phase === 'registro') {
            psicoBtn = `
                <button onclick="prepararPsicometrico('${id}')" 
                   class="px-3.5 py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/5">
                   <svg class="w-3.5 h-3.5 text-amber-400 inline-block mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h.01M12 12h.01M15 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                   Link
                </button>
            `;
        }
        
        return `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3.5">
                  <div class="size-10 rounded-full bg-mabaker-blue/10 text-mabaker-blue border border-mabaker-blue/20 flex items-center justify-center font-black text-xs shrink-0">
                    ${initials}
                  </div>
                  <div>
                    <div class="font-bold text-white text-sm leading-tight">${name}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <svg class="w-3 h-3 text-slate-400 inline-block" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"></path></svg> ${email}
                      <span class="text-slate-600">|</span>
                      <svg class="w-3 h-3 text-slate-400 inline-block" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3M12 18.75h.008v.008H12v-.008z"></path></svg> ${tel}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-slate-300 font-medium text-sm">${job}</td>
              <td class="px-6 py-4 text-slate-300 text-xs">${companySummary}</td>
              <td class="px-6 py-4">
                <span class="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${phaseClass}">
                  ${phaseLabel}
                </span>
              </td>
              <td class="px-6 py-4">${scoreHTML}</td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-end gap-2.5">
                  ${psicoBtn}
                  <button onclick="abrirModalCandidato('${id}')" 
                     class="px-3.5 py-2 rounded-xl bg-mabaker-blue/20 text-mabaker-blue hover:bg-mabaker-blue hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-md shadow-mabaker-blue/5">
                     <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"></path></svg>
                     Editar
                  </button>
                </div>
              </td>
            </tr>
        `;
      })
      .join("");

    const vacantesFiltradas = v.filter((item) => {
      if (state.vacanteFilter === "activas") return item.activo !== false;
      if (state.vacanteFilter === "pausadas") return item.activo === false;
      return true;
    });

    const vRows = vacantesFiltradas
      .map((x) => {
        const rawId = String(x.id || "");
        const id = esc(rawId);
        const idJs = rawId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const code = esc(x.codigo_puesto || "-");
        const job = esc(resolveJobName(x));
        const dept = esc(x.departamento || "-");
        const salary = `${fmtMoney(x.sueldo_minimo)} - ${fmtMoney(x.sueldo_maximo)}`;
        const isActive = x.activo !== false;
        const status = isActive ? 'Activa' : 'Pausada';
        const statusClass = x.activo !== false 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
        const exp = x.experiencia_minima_anios != null ? `${x.experiencia_minima_anios} años` : '—';
        const school = esc(x.escolaridad_minima || '—');
        
        return `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3.5">
                  <div class="size-10 rounded-xl bg-mabaker-red/10 text-mabaker-red border border-mabaker-red/20 flex items-center justify-center font-bold text-xs shrink-0">
                    ${code}
                  </div>
                  <div>
                    <div class="font-bold text-white text-sm leading-tight">${job}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5">${dept}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-slate-300 font-semibold text-sm">${salary}</td>
              <td class="px-6 py-4 text-slate-300 text-xs">${exp} de exp. / ${school}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <label class="inline-flex items-center cursor-pointer" title="Publicar / despublicar vacante">
                    <input type="checkbox" class="sr-only peer" ${isActive ? "checked" : ""} onchange="toggleVacanteActiva('${idJs}', this.checked)">
                    <div class="relative w-11 h-6 rounded-full bg-slate-600/60 peer-checked:bg-emerald-500/70 transition-colors">
                      <span class="absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></span>
                    </div>
                  </label>
                  <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusClass}">
                    ${status}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <button onclick="editarVacante('${id}')" 
                   class="px-3.5 py-2 rounded-xl bg-mabaker-red/20 text-mabaker-red hover:bg-mabaker-red hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 ml-auto shadow-md shadow-mabaker-red/5">
                   <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"></path></svg>
                   Editar
                </button>
              </td>
            </tr>
        `;
      })
      .join("");

    const rRows = r
      .map((x) => {
        const name = esc(resolveCandidateName(x));
        const job = esc(resolveJobName(x));
        const reason = esc(x.razon_rechazo || x.motivo_rechazo || x.motivo || "-");
        const date = fmtDate(x.created_at);
        const initials = name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || "?";
        
        return `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3.5">
                  <div class="size-9 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                    ${initials}
                  </div>
                  <div>
                    <div class="font-bold text-white text-sm leading-tight">${name}</div>
                    <div class="text-[10px] text-slate-500 mt-0.5">${esc(x.email || x.correo || "-")}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-slate-300 font-medium text-sm">${job}</td>
              <td class="px-6 py-4">
                <div class="text-rose-400 text-xs font-medium max-w-sm whitespace-pre-wrap">${reason}</div>
              </td>
              <td class="px-6 py-4 text-slate-400 text-xs font-semibold">${date}</td>
            </tr>
        `;
      })
      .join("");

    const lRows = l
      .map((x) => {
        const action = esc(x.accion || x.evento || "-");
        const user = esc(x.usuario || x.actor || "-");
        const date = fmtDate(x.created_at);
        
        return `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors text-xs">
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 font-mono text-slate-300">
                  <svg class="w-3.5 h-3.5 text-mabaker-blue inline-block mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  ${action}
                </div>
              </td>
              <td class="px-6 py-4 text-slate-400 font-semibold">${user}</td>
              <td class="px-6 py-4 text-slate-500 font-semibold">${date}</td>
            </tr>
        `;
      })
      .join("");

    const table = (headers, rows) => `
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-white/5">
            ${headers.map((h, i) => `<th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i === headers.length-1 ? 'text-right' : ''}">${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td class="px-6 py-12 text-center text-slate-500" colspan="${headers.length}"><svg class="w-10 h-10 text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Sin registros</td></tr>`}
        </tbody>
      </table>
    `;

    const recentC = (state.datasets.candidatos || []).slice(0, 5);
    const recentL = (state.datasets.logs || []).slice(0, 5);

    if (byId("tablaCandidatos")) byId("tablaCandidatos").innerHTML = table(["Candidato", "Puesto Aplicado", "Empresas", "Fase Proceso", "Score IA", "Acciones"], cRows);
    if (byId("tablaVacantes")) {
      const isTodas = state.vacanteFilter === "todas";
      const isActivas = state.vacanteFilter === "activas";
      const isPausadas = state.vacanteFilter === "pausadas";
      const filterControls = `
        <div class="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Filtrar</span>
          <button type="button" onclick="setVacanteFilter('todas')" class="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isTodas ? "bg-mabaker-blue/20 text-mabaker-blue border border-mabaker-blue/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}">Todas</button>
          <button type="button" onclick="setVacanteFilter('activas')" class="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActivas ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}">Activas</button>
          <button type="button" onclick="setVacanteFilter('pausadas')" class="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPausadas ? "bg-slate-500/20 text-slate-300 border border-slate-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}">Pausadas</button>
          <span class="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-500">${vacantesFiltradas.length} visibles</span>
        </div>
      `;
      byId("tablaVacantes").innerHTML = filterControls + table(["Código / Puesto", "Rango Salarial", "Requisitos", "Estado", "Acción"], vRows);
    }
    if (byId("tablaRechazados")) byId("tablaRechazados").innerHTML = table(["Candidato", "Vacante Aplicada", "Motivo de Descarte", "Fecha"], rRows);
    if (byId("tablaLogs")) byId("tablaLogs").innerHTML = table(["Evento / Operación", "Actor / Usuario", "Fecha de Registro"], lRows);
    
    if (byId("tablaRecentCandidatos")) {
      byId("tablaRecentCandidatos").innerHTML = table(
        ["Candidato", "Puesto", "Fase"],
        recentC
          .map((x) => {
            const initials = esc(resolveCandidateName(x)).split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || "?";
            return `
              <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="size-8 rounded-full bg-mabaker-blue/10 text-mabaker-blue border border-mabaker-blue/20 flex items-center justify-center font-bold text-[10px]">
                      ${initials}
                    </div>
                    <span class="font-bold text-white text-sm">${esc(resolveCandidateName(x))}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-slate-300 text-sm">${esc(resolveJobName(x))}</td>
                <td class="px-6 py-4"><span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-white/5 border border-white/10 uppercase tracking-widest text-slate-400">${esc(x.fase_actual || "-")}</span></td>
              </tr>
            `;
          })
          .join("")
      );
    }
    
    if (byId("tablaRecentLogs")) {
      byId("tablaRecentLogs").innerHTML = table(
        ["Operación / Evento", "Fecha"],
        recentL
          .map((x) => `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors text-xs">
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 font-mono text-slate-300">
                  <svg class="w-3.5 h-3.5 text-mabaker-blue inline-block mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  ${esc(x.accion || x.evento || "-")}
                </div>
              </td>
              <td class="px-6 py-4 text-slate-500 font-semibold">${fmtDate(x.created_at)}</td>
            </tr>
          `)
          .join("")
      );
    }
  }

  async function loadAdmin(resources) {
    const candidates = resources[0] ? await supaGet(resources[0].endpoint).catch(() => []) : [];
    state.datasets.candidatos = candidates;
    setText("statCandidatos", candidates.length);
    setText("statRechazados", candidates.filter((x) => (x.fase_actual || "").includes("rechaz")).length);
    setText("statMedico", candidates.filter((x) => (x.fase_actual || "").includes("medic")).length);
    setText("statContratos", candidates.filter((x) => (x.fase_actual || "") === "firma").length);
    setText("statPsico", candidates.filter((x) => (x.fase_actual || "").includes("psico")).length);

    const rows = candidates
      .slice(0, 20)
      .map(
        (x) => `<tr class="border-b border-slate-100"><td class="px-4 py-3">${esc(resolveCandidateName(x))}</td><td class="px-4 py-3">${esc(resolveJobName(x))}</td><td class="px-4 py-3">${esc(x.fase_actual || "-")}</td><td class="px-4 py-3">${fmtDate(x.created_at)}</td></tr>`
      )
      .join("");
    const container = byId("tablaCandidatos");
    if (container) {
      container.innerHTML = `<table class="min-w-full text-sm"><thead><tr><th class="px-4 py-3 text-left">Nombre</th><th class="px-4 py-3 text-left">Puesto</th><th class="px-4 py-3 text-left">Fase</th><th class="px-4 py-3 text-left">Fecha</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="px-4 py-8">Sin registros</td></tr>'}</tbody></table>`;
    }
  }

  async function loadJefe(session) {
    const d = (session.departamento || "").toLowerCase();
    const list = await supaGet(candidateEndpointForRole("jefe")).catch(() => []);
    const scoped = d ? list.filter((x) => (x.departamento || "").toLowerCase().includes(d)) : list;
    const pendientes = scoped.filter((x) => (x.fase_actual || "").includes("tecnica") || (x.fase_actual || "").includes("jefe"));
    const evaluados = scoped.filter((x) => x.veredicto_jefe || (x.fase_actual || "").includes("rechaz") || (x.fase_actual || "") === "firma");

    setText("deptName", session.departamento || "General");
    setText("statPendientes", pendientes.length);
    setText("statAprobados", evaluados.filter((x) => String(x.veredicto_jefe || "").toLowerCase().includes("aprob")).length);
    setText("statRechazadosJefe", evaluados.filter((x) => String(x.veredicto_jefe || "").toLowerCase().includes("rechaz")).length);

    const t1 = byId("tablaJefe");
    if (t1) {
      t1.innerHTML = `<table class="data-table"><thead><tr><th>Nombre</th><th>Puesto</th><th>Fase</th></tr></thead><tbody>${pendientes
        .map((x) => `<tr><td>${esc(resolveCandidateName(x))}</td><td>${esc(resolveJobName(x))}</td><td>${esc(x.fase_actual || "-")}</td></tr>`)
        .join("") || '<tr><td colspan="3" class="loading-row">Sin pendientes</td></tr>'}</tbody></table>`;
    }
    const t2 = byId("tablaEvaluados");
    if (t2) {
      t2.innerHTML = `<table class="data-table"><thead><tr><th>Nombre</th><th>Puesto</th><th>Resultado</th></tr></thead><tbody>${evaluados
        .map((x) => `<tr><td>${esc(resolveCandidateName(x))}</td><td>${esc(resolveJobName(x))}</td><td>${esc(x.veredicto_jefe || x.fase_actual || "-")}</td></tr>`)
        .join("") || '<tr><td colspan="3" class="loading-row">Sin evaluados</td></tr>'}</tbody></table>`;
    }
  }

  async function loadMedico() {
    const list = await supaGet("/rest/v1/candidatos_activos?select=*&order=created_at.desc").catch(() => []);
    const pendientes = list.filter((x) => (x.fase_actual || "").includes("medic"));
    const evaluados = list.filter((x) => x.dictamen_medico || x.resultado_medico);

    setText("statPendientes", pendientes.length);
    setText("statAptos", evaluados.filter((x) => String(x.dictamen_medico || x.resultado_medico || "").toLowerCase().includes("apto")).length);
    setText("statCondicionados", evaluados.filter((x) => String(x.dictamen_medico || x.resultado_medico || "").toLowerCase().includes("cond")).length);
    setText("statNoAptos", evaluados.filter((x) => String(x.dictamen_medico || x.resultado_medico || "").toLowerCase().includes("no apt")).length);

    const t1 = byId("tablaMedico");
    if (t1) {
      t1.innerHTML = `<table class="data-table"><thead><tr><th>Nombre</th><th>Puesto</th><th>Fase</th></tr></thead><tbody>${pendientes
        .map((x) => `<tr><td>${esc(resolveCandidateName(x))}</td><td>${esc(resolveJobName(x))}</td><td>${esc(x.fase_actual || "-")}</td></tr>`)
        .join("") || '<tr><td colspan="3" class="loading-row">Sin pendientes</td></tr>'}</tbody></table>`;
    }
    const t2 = byId("tablaEvaluados");
    if (t2) {
      t2.innerHTML = `<table class="data-table"><thead><tr><th>Nombre</th><th>Puesto</th><th>Dictamen</th></tr></thead><tbody>${evaluados
        .map((x) => `<tr><td>${esc(resolveCandidateName(x))}</td><td>${esc(resolveJobName(x))}</td><td>${esc(x.dictamen_medico || x.resultado_medico || "-")}</td></tr>`)
        .join("") || '<tr><td colspan="3" class="loading-row">Sin evaluados</td></tr>'}</tbody></table>`;
    }

    const t3 = byId("tablaAlertas");
    if (t3) {
      const alertas = list.filter((x) => x.enfermedades_cronicas || x.alergias);
      t3.innerHTML = `<table class="data-table"><thead><tr><th>Nombre</th><th>Alerta</th></tr></thead><tbody>${alertas
        .map((x) => `<tr><td>${esc(resolveCandidateName(x))}</td><td>${esc(x.enfermedades_cronicas || x.alergias || "-")}</td></tr>`)
        .join("") || '<tr><td colspan="2" class="loading-row">Sin alertas</td></tr>'}</tbody></table>`;
    }
  }

  function toggleSidebar() {
    const sidebar = byId("sidebar");
    if (sidebar) sidebar.classList.toggle("open");
  }

  function editarVacante(id) {
    const v = (state.datasets.vacantes || []).find((x) => String(x.id) === String(id));
    if (!v) return;
    state.currentVacanteId = v.id;
    setInput("editV_nombre", v.nombre_puesto);
    setText("editV_codigo", v.codigo_puesto || "COD-000");
    setInput("editV_depto", v.departamento);
    setInput("editV_sMin", v.sueldo_minimo);
    setInput("editV_sMax", v.sueldo_maximo);
    setInput("editV_escolaridad", v.escolaridad_minima || "Sin especificar");
    setInput("editV_exp", v.experiencia_minima_anios || 0);
    setInput("editV_desc", v.descripcion_completa || v.descripcion_puesto || "");
    setInput("editV_conocimientos", v.conocimientos_tecnicos || "");
    const chk = byId("editV_activo");
    if (chk) chk.checked = v.activo !== false;
    const modal = byId("modalVacante");
    if (modal) modal.classList.remove("hidden");
  }

  async function guardarCambiosVacante() {
    if (!state.currentVacanteId) return;
    const payload = {
      nombre_puesto: getInput("editV_nombre"),
      departamento: getInput("editV_depto"),
      sueldo_minimo: numberOrNull(getInput("editV_sMin")),
      sueldo_maximo: numberOrNull(getInput("editV_sMax")),
      escolaridad_minima: getInput("editV_escolaridad"),
      experiencia_minima_anios: numberOrNull(getInput("editV_exp")) || 0,
      descripcion_completa: getInput("editV_desc"),
      descripcion_puesto: getInput("editV_desc"),
      conocimientos_tecnicos: getInput("editV_conocimientos"),
      activo: !!(byId("editV_activo") && byId("editV_activo").checked),
    };
    await supaPatch(`/rest/v1/catalogo_puestos?id=eq.${state.currentVacanteId}`, normalizeSavePayload(payload)).catch(() => alert("No se pudo guardar la vacante"));
    cerrarModalVacante();
    await reloadCurrentRoleData();
  }

  async function toggleVacanteActiva(id, nextActive) {
    try {
      await supaPatch(`/rest/v1/catalogo_puestos?id=eq.${encodeURIComponent(id)}`, {
        activo: !!nextActive,
      });
      await reloadCurrentRoleData();
      alert(`Vacante ${nextActive ? "publicada" : "pausada"} correctamente.`);
    } catch (e) {
      console.error("No se pudo cambiar estado de vacante:", e);
      alert("No se pudo actualizar el estado de la vacante.");
      await reloadCurrentRoleData();
    }
  }

  function abrirModalCandidato(id) {
    const c = (state.datasets.candidatos || []).find((x) => String(x.id) === String(id));
    if (!c) return;
    state.currentCandidatoId = c.id;
    setInput("editC_nombre", resolveCandidateName(c));
    setText("editC_puesto", resolveJobName(c));
    setInput("editC_email", resolveCandidateEmail(c));
    setInput("editC_tel", c.telefono || "");
    setInput("editC_edad", c.edad || "");
    setInput("editC_genero", c.genero || "");
    setInput("editC_fase", c.fase_actual || "registro");
    const experiencesText = formatWorkExperiencesText(c);
    const firstCompany =
      getWorkExperiences(c)[0]?.empresa ||
      c.empresa_1 ||
      c.empresa ||
      "";
    setInput("editC_empresa", firstCompany);
    setInput("editC_experiencias", experiencesText);
    setInput("editC_escolaridad", c.escolaridad || "");
    
    // Cargar nuevos campos de expediente
    setInput("editC_curp", c.curp || "");
    setInput("editC_rfc", c.rfc || "");
    setInput("editC_domicilio", c.domicilio || "");
    setInput("editC_cedula", c.cedula_profesional || "");
    setInput("editC_nivel", c.nivel_socioeconomico || "");

    // Poner nombres reales de documentos dinámicamente
    const pName = resolveCandidateName(c).replace(/\s+/g, '_');
    setText("doc_cv_name", `CV_${pName}.pdf`);
    setText("doc_ine_name", `INE_${pName}.jpg`);
    setText("doc_curp_name", `CURP_${pName}.pdf`);
    setText("doc_rfc_name", `RFC_${pName}.pdf`);

    // Resetear a pestaña inicial (Datos Generales)
    if (window.cambiarTabCandidato) {
        window.cambiarTabCandidato('datos');
    }

    const initials = (resolveCandidateName(c).match(/\b\w/g) || ["?"]).slice(0, 2).join("").toUpperCase();
    setText("editC_initials", initials);
    const modal = byId("modalCandidato");
    if (modal) modal.classList.remove("hidden");
  }

  async function guardarCambiosCandidato() {
    if (!state.currentCandidatoId) return;
    const payload = {
      nombre_completo: getInput("editC_nombre"),
      email: getInput("editC_email"),
      telefono: getInput("editC_tel"),
      edad: numberOrNull(getInput("editC_edad")),
      genero: getInput("editC_genero"),
      fase_actual: getInput("editC_fase"),
      empresa_1: getInput("editC_empresa"),
      escolaridad: getInput("editC_escolaridad"),
      // Nuevos campos
      curp: getInput("editC_curp"),
      rfc: getInput("editC_rfc"),
      domicilio: getInput("editC_domicilio"),
      cedula_profesional: getInput("editC_cedula"),
      nivel_socioeconomico: getInput("editC_nivel"),
    };
    await supaPatch(`/rest/v1/candidatos_activos?id=eq.${state.currentCandidatoId}`, normalizeSavePayload(payload)).catch(() => alert("No se pudo guardar el candidato"));
    cerrarModalCandidato();
    await loadRRHH([
      { id: "candidatos", endpoint: "/rest/v1/candidatos_activos?select=*&order=created_at.desc" },
      { id: "rechazados", endpoint: "/rest/v1/prospectos_rechazados?select=*&order=created_at.desc" },
      { id: "vacantes", endpoint: "/rest/v1/catalogo_puestos?select=*&order=creado_en.desc" },
      { id: "logs", endpoint: "/rest/v1/log_agente?select=*&order=created_at.desc&limit=50" },
    ]);
  }

  async function cargarEvaluacionesCandidato(candidateId) {
    const pane = document.getElementById('c-pane-psicometricos');
    if (!pane) return;
    pane.innerHTML = `
        <div class="flex items-center justify-center p-12">
            <div class="animate-spin size-8 border-4 border-mabaker-blue border-t-transparent rounded-full"></div>
            <span class="ml-4 font-semibold text-slate-400">Cargando respuestas psicométricas desde Supabase...</span>
        </div>
    `;

    try {
        const evals = await supaGet(`/rest/v1/evaluaciones_psicometricas?id_candidato=eq.${candidateId}&select=*,pruebas_psicometricas(nombre,codigo)`);
        
        if (!evals || evals.length === 0) {
            pane.innerHTML = `
                <div class="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-3xl">
                    <svg class="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 21l8.97-8.97M18 12V4L5 12h13z"></path></svg>
                    <p class="font-bold text-white text-base">Sin evaluaciones psicométricas completadas</p>
                    <p class="text-xs text-slate-400 mt-1">Este candidato aún no ha contestado sus baterías psicométricas o se encuentra en fase de registro.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="space-y-8">';
        
        for (const ev of evals) {
            const testName = ev.pruebas_psicometricas?.nombre || "Batería Psicométrica";
            const score = ev.score_total != null ? `${ev.score_total}%` : "0%";
            const resClass = ev.resultado === 'APROBADO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
            const resLabel = ev.resultado || 'PENDIENTE';
            
            // Cargar preguntas para mostrar el texto real
            const questions = await supaGet(`/rest/v1/preguntas_psicometricas?id_prueba=eq.${ev.id_prueba}&order=numero_orden`).catch(() => []);
            
            const answersArray = Array.isArray(ev.respuestas) ? ev.respuestas : [];
            
            let answersHTML = '';
            if (answersArray.length === 0) {
                answersHTML = `<p class="text-xs text-slate-500 italic p-4">Respuestas detalladas no disponibles.</p>`;
            } else {
                answersHTML = `
                    <div class="space-y-4 max-h-[300px] overflow-y-auto scroll-custom pr-2">
                        ${answersArray.map((ans, idx) => {
                            const qTextObj = questions.find(q => q.id === ans.id_pregunta || q.numero_orden === ans.numero);
                            const qText = qTextObj ? qTextObj.texto_pregunta : `Pregunta ${ans.numero || (idx + 1)}`;
                            const isCorrect = ans.correcta;
                            const resultIcon = isCorrect === true ? '🟢 Correcta' : isCorrect === false ? '🔴 Incorrecta' : '⚪ Respondida';
                            const resultClass = isCorrect === true ? 'text-emerald-400' : isCorrect === false ? 'text-rose-400' : 'text-slate-400';
                            
                            return `
                                <div class="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
                                    <div class="flex justify-between items-start">
                                        <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Reactivo ${ans.numero || (idx + 1)}</span>
                                        <span class="text-[9px] font-black uppercase tracking-widest ${resultClass}">${resultIcon}</span>
                                    </div>
                                    <p class="text-sm font-semibold text-white">${esc(qText)}</p>
                                    <div class="flex gap-2 text-xs">
                                        <span class="text-slate-400">Respuesta elegida:</span>
                                        <span class="text-mabaker-blue font-bold">${esc(ans.respuesta_dada)}</span>
                                    </div>
                                    ${ans.valor_obtenido != null ? `
                                    <div class="text-[10px] text-slate-500 font-semibold">
                                        Puntuación: <span class="text-slate-300 font-bold">${ans.valor_obtenido}</span> pts
                                    </div>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }

            html += `
                <div class="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-6">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-4">
                        <div>
                            <h4 class="font-black text-white text-lg tracking-tight">${esc(testName)}</h4>
                            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Completada el: ${fmtDate(ev.completado_en)}</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-center">
                                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest block leading-none">Puntuación</span>
                                <span class="text-lg font-black text-white leading-none mt-1 inline-block">${score}</span>
                            </div>
                            <span class="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${resClass}">
                                ${resLabel}
                            </span>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle de Reactivos Contestados</h5>
                        ${answersHTML}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        pane.innerHTML = html;

    } catch (e) {
        console.error("Error al cargar evaluaciones:", e);
        pane.innerHTML = `
            <div class="p-8 text-center text-rose-400 border border-rose-500/20 bg-rose-500/5 rounded-3xl">
                ⚠️ Error cargando los resultados desde Supabase. Inténtalo de nuevo.
            </div>
        `;
    }
  }

  function cerrarModalVacante() {
    const m = byId("modalVacante");
    if (m) m.classList.add("hidden");
    state.currentVacanteId = null;
  }

  function cerrarModalCandidato() {
    const m = byId("modalCandidato");
    if (m) m.classList.add("hidden");
    state.currentCandidatoId = null;
  }

  function setInput(id, value) {
    const el = byId(id);
    if (!el) return;
    const raw = value ?? "";
    el.value =
      window.MB_UPPERCASE && window.MB_UPPERCASE.shouldTransform(el)
        ? window.MB_UPPERCASE.transformValue(String(raw))
        : raw;
  }

  function getInput(id) {
    const el = byId(id);
    if (!el) return "";
    const val = el.value;
    return window.MB_UPPERCASE && window.MB_UPPERCASE.shouldTransform(el)
      ? window.MB_UPPERCASE.transformValue(val)
      : val;
  }

  function normalizeSavePayload(payload) {
    return window.MB_UPPERCASE
      ? window.MB_UPPERCASE.normalizePayload(payload)
      : payload;
  }

  function numberOrNull(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function logout() {
    localStorage.removeItem("mb_token");
    localStorage.removeItem("mb_rol");
    localStorage.removeItem("mb_nombre");
    localStorage.removeItem("mb_departamento");
    localStorage.removeItem("mb_expira");
    localStorage.removeItem("mabaker_session");
    window.location.href = "login.html";
  }

  window.state = state;
  window.cargarEvaluacionesCandidato = cargarEvaluacionesCandidato;
  window.initDashboard = initDashboard;
  window.activarPanel = activarPanel;
  window.setVacanteFilter = setVacanteFilter;
  window.toggleSidebar = toggleSidebar;
  window.editarVacante = editarVacante;
  window.toggleVacanteActiva = toggleVacanteActiva;
  window.guardarCambiosVacante = guardarCambiosVacante;
  window.cerrarModalVacante = cerrarModalVacante;
  window.abrirModalCandidato = abrirModalCandidato;
  window.guardarCambiosCandidato = guardarCambiosCandidato;
  window.cerrarModalCandidato = cerrarModalCandidato;
  window.logout = logout;
})();
