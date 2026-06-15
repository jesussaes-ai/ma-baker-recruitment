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
    viewingVacanteId: null,
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

    bindNotificationsUI();
  }

  function bindNotificationsUI() {
    const bell = byId("notifBellBtn");
    const refresh = byId("notifRefreshBtn");
    const wrap = byId("notifWrap");
    if (!bell) return;

    bell.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleNotifDropdown();
    });

    if (refresh) {
      refresh.addEventListener("click", async (e) => {
        e.stopPropagation();
        await reloadCurrentRoleData();
        renderNotificationsDropdown();
        updateNotificationBadge();
      });
    }

    document.addEventListener("click", (e) => {
      if (!wrap || wrap.contains(e.target)) return;
      closeNotifDropdown();
    });
  }

  function buildNotifications() {
    const items = [];
    const pending = pendingVacantes();
    if (pending.length) {
      items.push({
        id: "publicar",
        panel: "publicar",
        title: `${pending.length} descripción(es) sin publicar`,
        desc: "Publique en el portal para que los candidatos las vean",
        tone: "amber",
      });
    }

    const c = state.datasets.candidatos || [];
    const weekAgo = Date.now() - 7 * 86400000;
    const nuevos = c.filter((x) => x.created_at && new Date(x.created_at).getTime() >= weekAgo);
    if (nuevos.length) {
      items.push({
        id: "nuevos",
        panel: "candidatos",
        title: `${nuevos.length} candidato(s) nuevos`,
        desc: "Postulaciones recibidas en los últimos 7 días",
        tone: "blue",
      });
    }

    const psico = c.filter((x) => (x.fase_actual || "").toLowerCase().includes("psico"));
    if (psico.length) {
      items.push({
        id: "psico",
        panel: "candidatos",
        title: `${psico.length} en evaluación psicométrica`,
        desc: "Seguimiento de pruebas y resultados",
        tone: "purple",
      });
    }

    const medic = c.filter((x) => (x.fase_actual || "").toLowerCase().includes("medic"));
    if (medic.length) {
      items.push({
        id: "medic",
        panel: "candidatos",
        title: `${medic.length} pendientes de revisión médica`,
        desc: "Candidatos en fase médica del proceso",
        tone: "emerald",
      });
    }

    return items;
  }

  function notifToneClass(tone) {
    const map = {
      amber: "bg-amber-500/15 text-amber-300 border-amber-500/20",
      blue: "bg-mabaker-blue/15 text-mabaker-blue border-mabaker-blue/20",
      purple: "bg-purple-500/15 text-purple-300 border-purple-500/20",
      emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    };
    return map[tone] || "bg-white/10 text-slate-300 border-white/10";
  }

  function renderNotificationsDropdown() {
    const list = byId("notifDropdownList");
    if (!list) return;
    const items = buildNotifications();
    if (!items.length) {
      list.innerHTML = `<p class="p-6 text-center text-slate-400 text-sm font-medium">Sin alertas pendientes</p>`;
      return;
    }
    list.innerHTML = items
      .map(
        (n) => `
        <button type="button" data-notif-panel="${esc(n.panel)}"
          class="w-full text-left p-4 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10 mb-1 group">
          <div class="flex items-start gap-3">
            <span class="shrink-0 mt-0.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${notifToneClass(n.tone)}">${esc(n.id)}</span>
            <div class="min-w-0">
              <p class="text-sm font-bold text-white group-hover:text-mabaker-red transition-colors">${esc(n.title)}</p>
              <p class="text-xs text-slate-400 mt-1">${esc(n.desc)}</p>
            </div>
          </div>
        </button>`
      )
      .join("");

    list.querySelectorAll("[data-notif-panel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigateFromNotif(btn.dataset.notifPanel);
      });
    });
  }

  function updateNotificationBadge() {
    const dot = byId("notifDot");
    if (!dot) return;
    const hasAlerts = buildNotifications().length > 0;
    const dropdownOpen = byId("notifDropdown") && !byId("notifDropdown").classList.contains("hidden");
    dot.classList.toggle("hidden", !hasAlerts || dropdownOpen);
  }

  function toggleNotifDropdown() {
    const dd = byId("notifDropdown");
    const bell = byId("notifBellBtn");
    if (!dd) return;
    const willOpen = dd.classList.contains("hidden");
    dd.classList.toggle("hidden");
    if (bell) bell.setAttribute("aria-expanded", willOpen ? "true" : "false");
    if (willOpen) {
      renderNotificationsDropdown();
    }
    updateNotificationBadge();
  }

  function closeNotifDropdown() {
    const dd = byId("notifDropdown");
    const bell = byId("notifBellBtn");
    if (!dd || dd.classList.contains("hidden")) return;
    dd.classList.add("hidden");
    if (bell) bell.setAttribute("aria-expanded", "false");
    updateNotificationBadge();
  }

  function navigateFromNotif(panel) {
    closeNotifDropdown();
    const nav = document.querySelector(`.nav-item[data-panel="${panel}"]`);
    activarPanel(panel, nav);
  }

  function renderAjustesPanel() {
    const el = byId("ajustesContent");
    if (!el) return;
    const s = sessionFromStorage();
    const theme = window.MB_THEME?.getCurrent?.() || "dark";
    const themeLabel = theme === "dark" ? "Modo oscuro" : "Modo claro";
    const company = window.MB_BRAND?.COMPANY_NAME || window.MB_CONFIG?.COMPANY_NAME || "Ma Baker and Chef";
    const portalUrl = "index.html";

    el.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Sesión activa</p>
          <div class="space-y-2">
            <p class="text-lg font-black text-white">${esc(s.nombre || "Usuario")}</p>
            <p class="text-sm text-slate-400">${esc(formatRoleLabel(s.rol))}${s.departamento ? ` · ${esc(s.departamento)}` : ""}</p>
          </div>
          <button type="button" onclick="logout()" class="px-4 py-2 rounded-xl bg-mabaker-red/20 text-mabaker-red border border-mabaker-red/30 text-[10px] font-black uppercase tracking-widest hover:bg-mabaker-red hover:text-white transition-all">Cerrar sesión</button>
        </div>

        <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Apariencia</p>
          <p class="text-sm text-slate-300">Tema actual: <span id="ajustesThemeLabel" class="font-bold text-white">${esc(themeLabel)}</span></p>
          <button type="button" id="ajustesThemeToggle" class="px-5 py-3 rounded-xl bg-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all">
            Cambiar a ${theme === "dark" ? "modo claro" : "modo oscuro"}
          </button>
        </div>

        <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Portal de candidatos</p>
          <p class="text-sm text-slate-400">Vista pública de vacantes publicadas en ${esc(company)}.</p>
          <a href="${esc(portalUrl)}" target="_blank" rel="noopener" class="inline-flex px-5 py-3 rounded-xl bg-mabaker-blue/20 text-mabaker-blue border border-mabaker-blue/30 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">Abrir portal</a>
        </div>

        <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Accesos rápidos</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" data-quick-panel="descripciones" class="quick-panel-btn px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Descripciones</button>
            <button type="button" data-quick-panel="publicar" class="quick-panel-btn px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Publicar</button>
            <button type="button" data-quick-panel="candidatos" class="quick-panel-btn px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Candidatos</button>
            <a href="cargar-puestos.html" class="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Gestor de vacantes</a>
          </div>
        </div>
      </div>`;

    const themeBtn = byId("ajustesThemeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        window.MB_THEME?.toggle?.();
        renderAjustesPanel();
      });
    }

    el.querySelectorAll(".quick-panel-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = btn.dataset.quickPanel;
        const nav = document.querySelector(`.nav-item[data-panel="${panel}"]`);
        activarPanel(panel, nav);
      });
    });
  }

  function panelTitle(panel) {
    const map = {
      dashboard: "Gestión de Talento",
      descripciones: "Descripciones de Puesto",
      publicar: "Publicar Vacantes",
      candidatos: "Candidatos Activos",
      vacantes: "Catálogo de Puestos",
      rechazados: "Historial de Rechazos",
      logs: "Logs del Sistema",
      ajustes: "Ajustes del Sistema",
      pendientes: "Pendientes",
      evaluados: "Evaluados",
      alertas: "Alertas",
    };
    return map[panel] || "Dashboard";
  }

  function showUploadSection(show) {
    const section = byId("vacantesUploadSection");
    if (!section) return;
    section.classList.toggle("hidden", !show);
  }

  function activarPanel(panel, source) {
    closeNotifDropdown();
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));

    let targetPanel = panel;
    if (panel === "descripciones") {
      targetPanel = "vacantes";
      state.vacanteFilter = "biblioteca";
      showUploadSection(true);
    } else if (panel === "vacantes") {
      state.vacanteFilter = state.vacanteFilter || "todas";
      showUploadSection(false);
    } else if (panel === "publicar") {
      showUploadSection(false);
    } else {
      showUploadSection(false);
    }

    const target = byId(`panel-${targetPanel}`);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-item[data-panel]").forEach((n) => n.classList.remove("nav-item-active", "active"));
    if (source) source.classList.add("nav-item-active", "active");

    setText("panelTitle", panelTitle(panel));

    if (panel === "descripciones" || panel === "vacantes") {
      const titleEl = byId("vacantesPanelTitle");
      const subEl = byId("vacantesPanelSubtitle");
      if (panel === "descripciones") {
        if (titleEl) titleEl.textContent = "Descripciones de Puesto";
        if (subEl) subEl.textContent = "Sube, guarda y edita tus archivos de descripción antes de publicar";
      } else {
        if (titleEl) titleEl.textContent = "Catálogo de Puestos";
        if (subEl) subEl.textContent = "Biblioteca interna y vacantes publicadas en el portal de postulación";
      }
      renderRRHHTables();
    }
    if (panel === "publicar") {
      renderPublicarPanel();
    }
    if (panel === "ajustes") {
      renderAjustesPanel();
    }
    if (panel === "logs") {
      reloadCurrentRoleData().then(() => renderRRHHTables());
    }

    if (panel && panel !== "dashboard") {
      try {
        history.replaceState(null, "", `#${panel}`);
      } catch (_) { /* noop */ }
    }
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
      await loadRRHH(resources || []);
      initVacantesUploadWidget();
      openPanelFromHash();
      return;
    }
    if (role === "jefe") return loadJefe(s);
    if (role === "medico") return loadMedico();
  }

  const ROLE_LABELS = {
    admin: "Administrador",
    rrhh: "Recursos Humanos",
    medico: "Médico",
    jefe: "Jefe de Área",
    sgi: "SGI / Calidad",
    seguridad: "Seguridad e Higiene",
  };

  function formatRoleLabel(rol) {
    const key = String(rol || "").toLowerCase();
    return ROLE_LABELS[key] || key || "Usuario";
  }

  function hydrateUser(s) {
    const userInfo = byId("userInfo") || byId("sidebarProfile");
    if (!userInfo) return;
    const nombre = esc(s.nombre || "Usuario");
    const rol = esc(formatRoleLabel(s.rol));
    userInfo.innerHTML = `
      <p class="text-xs font-bold text-white truncate">${nombre}</p>
      <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">${rol}</p>
    `;
  }

  async function loadCandidatesForRole() {
    if (window.MB_CANDIDATES && localStorage.getItem("mb_token")) {
      const medical = state.role === "medico";
      const data = await window.MB_CANDIDATES.listCandidates({ medical });
      return medical ? data : data.map((c) => removeMedicalFieldsFromCandidate(c));
    }
    const endpoint = candidateEndpointForRole(state.role);
    const data = await supaGet(endpoint);
    return state.role === "medico"
      ? data
      : data.map((c) => removeMedicalFieldsFromCandidate(c));
  }

  async function loadRRHH(resources) {
    console.log("📋 loadRRHH: starting...");
    const map = {};
    await Promise.all(
      resources.map(async (r) => {
        try {
          if (r.id === "candidatos") {
            map[r.id] = await loadCandidatesForRole();
            return;
          }
          if (r.id === "rechazados" && window.MB_CANDIDATES && localStorage.getItem("mb_token")) {
            map[r.id] = await window.MB_CANDIDATES.listRejected().catch(() => []);
            return;
          }
          if (r.id === "logs" && window.MB_CANDIDATES && localStorage.getItem("mb_token")) {
            map[r.id] = await window.MB_CANDIDATES.listSystemLogs(50).catch(() => []);
            return;
          }
          const data = await supaGet(r.endpoint);
          map[r.id] = data;
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
    updateNotificationBadge();
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

  function pendingVacantes() {
    return (state.datasets.vacantes || []).filter((x) => x.activo === false);
  }

  function renderPublicarPanel() {
    const el = byId("tablaPublicar");
    if (!el) return;
    const pending = pendingVacantes();
    const countEl = byId("publicarCount");
    if (countEl) countEl.textContent = `${pending.length} descripción(es) pendientes de publicar`;

    if (!pending.length) {
      el.innerHTML = `
        <div class="p-16 text-center space-y-4">
          <p class="text-slate-400 font-medium">No hay descripciones pendientes de publicar.</p>
          <button type="button" onclick="activarPanel('descripciones', document.querySelector('[data-panel=descripciones]'))"
            class="px-6 py-3 rounded-2xl bg-mabaker-blue/20 text-mabaker-blue border border-mabaker-blue/30 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">
            Ir a subir descripciones
          </button>
        </div>`;
      return;
    }

    el.innerHTML = `
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-white/5 bg-white/[0.02]">
            <th class="px-6 py-4 w-10">
              <input type="checkbox" id="pubSelectAll" onchange="togglePublicarTodos(this.checked)" title="Seleccionar todas" class="rounded">
            </th>
            <th class="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Puesto</th>
            <th class="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Departamento</th>
            <th class="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Archivo origen</th>
            <th class="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          ${pending.map((v) => {
            const id = esc(v.id || "");
            const idJs = String(v.id || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
            return `
            <tr class="hover:bg-white/[0.03] transition-colors">
              <td class="px-6 py-4"><input type="checkbox" class="pub-check rounded" value="${id}" data-id="${id}"></td>
              <td class="px-6 py-4 text-sm font-bold text-white">${esc(v.nombre_puesto || "—")}</td>
              <td class="px-6 py-4 text-xs text-slate-400">${esc(v.departamento || "—")}</td>
              <td class="px-6 py-4 text-xs text-slate-500 truncate max-w-[200px]">${esc(v.nombre_archivo_fuente || "—")}</td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button type="button" onclick="verDescripcionVacante('${idJs}')" class="px-3 py-2 rounded-xl bg-mabaker-blue/20 text-mabaker-blue text-xs font-bold hover:bg-mabaker-blue hover:text-white transition-all">Ver</button>
                  <button type="button" onclick="editarVacante('${idJs}')" class="px-3 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold hover:bg-white/20 transition-all">Editar</button>
                  <button type="button" onclick="publicarVacanteDesdePanel('${idJs}')" class="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">Publicar</button>
                </div>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  }

  function togglePublicarTodos(checked) {
    document.querySelectorAll(".pub-check").forEach((cb) => { cb.checked = checked; });
  }

  async function publicarVacanteDesdePanel(id) {
    if (!window.MB_VACANTES) {
      alert("Servicio de vacantes no disponible.");
      return;
    }
    try {
      await window.MB_VACANTES.updateVacante(id, { activo: true });
      await reloadCurrentRoleData();
      renderPublicarPanel();
      renderRRHHStats();
    } catch (e) {
      alert("No se pudo publicar: " + (e.message || e));
    }
  }

  async function publicarVacantesSeleccionadas() {
    const ids = [...document.querySelectorAll(".pub-check:checked")].map((cb) => cb.value);
    if (!ids.length) {
      alert("Selecciona al menos una descripción para publicar.");
      return;
    }
    if (!window.MB_VACANTES) {
      alert("Servicio de vacantes no disponible.");
      return;
    }
    let ok = 0;
    for (const id of ids) {
      try {
        await window.MB_VACANTES.updateVacante(id, { activo: true });
        ok++;
      } catch (e) {
        console.error(id, e);
      }
    }
    alert(`Publicadas ${ok} de ${ids.length} vacante(s) en el portal de postulación.`);
    await reloadCurrentRoleData();
    renderPublicarPanel();
    renderRRHHStats();
  }

  function openPanelFromHash() {
    const hash = (window.location.hash || "").replace("#", "").trim();
    if (!hash || hash === "dashboard") return;
    const nav = document.querySelector(`.nav-item[data-panel="${hash}"]`);
    if (nav) activarPanel(hash, nav);
  }

  function logEventBadge(evento) {
    const key = String(evento || "").toUpperCase();
    const map = {
      PROMOTE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
      ARCHIVE: "bg-rose-500/15 text-rose-300 border-rose-500/20",
      POSTULACION: "bg-mabaker-blue/15 text-mabaker-blue border-mabaker-blue/20",
      RECHAZO: "bg-rose-500/15 text-rose-300 border-rose-500/20",
      VACANTE_PUBLICADA: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
      VACANTE_BIBLIOTECA: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    };
    if (map[key]) return map[key];
    if (key.includes("UPDATE") || key.includes("PHASE")) return "bg-purple-500/15 text-purple-300 border-purple-500/20";
    return "bg-white/10 text-slate-300 border-white/10";
  }

  function renderLogRows(logs) {
    return (logs || [])
      .map((x) => {
        const evento = esc(x.evento || x.decision || x.accion || "-");
        const actor = esc(x.actor || x.nombre_candidato || x.usuario || "Sistema");
        const detalle = esc(x.detalle || x.reasoning || x.codigo_puesto || "-");
        const date = fmtDate(x.created_at);
        const badgeClass = logEventBadge(x.evento || x.decision);

        return `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors text-xs">
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${badgeClass}">${evento}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-slate-300 font-semibold">${actor}</td>
              <td class="px-6 py-4 text-slate-400">${detalle}</td>
              <td class="px-6 py-4 text-slate-500 font-semibold text-right">${date}</td>
            </tr>
        `;
      })
      .join("");
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
        } else if (phase === 'psicometricos_realizados') {
            psicoBtn = `
                <button onclick="avanzarAMedico('${id}')"
                   class="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5">
                   Enviar a médico
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
      if (state.vacanteFilter === "biblioteca") return item.activo === false;
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
        const status = isActive ? 'Publicada' : 'Solo biblioteca';
        const statusClass = isActive
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400/90 border border-amber-500/20';
        const exp = x.experiencia_minima_anios != null ? `${x.experiencia_minima_anios} años` : '—';
        const school = esc(x.escolaridad_minima || '—');
        const pdfName = esc((x.nombre_archivo_fuente || (x.fuente_pdf ? 'PDF' : 'Manual')).substring(0, 28));
        
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
              <td class="px-6 py-4 text-slate-400 text-xs font-mono">${pdfName}</td>
              <td class="px-6 py-4 text-slate-300 font-semibold text-sm">${salary}</td>
              <td class="px-6 py-4 text-slate-300 text-xs">${exp} / ${school}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <label class="inline-flex items-center cursor-pointer" title="Visible en portal de postulación">
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
                <div class="flex items-center justify-end gap-2">
                  <button onclick="verDescripcionVacante('${id}')" 
                     class="px-3 py-2 rounded-xl bg-mabaker-blue/20 text-mabaker-blue hover:bg-mabaker-blue hover:text-white transition-all text-xs font-bold">
                     Ver descripción
                  </button>
                  <button onclick="editarVacante('${id}')" 
                     class="px-3 py-2 rounded-xl bg-mabaker-red/20 text-mabaker-red hover:bg-mabaker-red hover:text-white transition-all text-xs font-bold">
                     Editar
                  </button>
                </div>
              </td>
            </tr>
        `;
      })
      .join("");

    const rRows = r
      .map((x) => {
        const id = esc(x.id || "");
        const name = esc(resolveCandidateName(x));
        const job = esc(resolveJobName(x));
        const score = x.match_score ?? x.decision_agente?.score ?? null;
        const reason = esc(
          x.razon_rechazo ||
          x.decision_agente?.reasoning ||
          x.motivo_rechazo ||
          x.motivo ||
          "-"
        );
        const date = fmtDate(x.created_at);
        const initials = name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || "?";
        const scoreHtml = score != null
          ? `<span class="font-black text-rose-400">${esc(String(score))}</span><span class="text-[10px] text-slate-500">/100</span>`
          : `<span class="text-slate-500">—</span>`;
        
        return `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onclick="abrirModalRechazado('${id}')">
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
              <td class="px-6 py-4">${scoreHtml}</td>
              <td class="px-6 py-4">
                <div class="text-rose-400 text-xs font-medium max-w-sm whitespace-pre-wrap">${reason}</div>
              </td>
              <td class="px-6 py-4 text-slate-400 text-xs font-semibold">${date}</td>
            </tr>
        `;
      })
      .join("");

    const lRows = renderLogRows(l);

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
      const isBiblioteca = state.vacanteFilter === "pausadas" || state.vacanteFilter === "biblioteca";
      const filterControls = `
        <div class="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">Filtrar</span>
          <button type="button" onclick="setVacanteFilter('todas')" class="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isTodas ? "bg-mabaker-blue/20 text-mabaker-blue border border-mabaker-blue/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}">Todas</button>
          <button type="button" onclick="setVacanteFilter('activas')" class="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActivas ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}">Publicadas</button>
          <button type="button" onclick="setVacanteFilter('biblioteca')" class="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isBiblioteca ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}">Solo biblioteca</button>
          <span class="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-500">${vacantesFiltradas.length} visibles</span>
        </div>
      `;
      byId("tablaVacantes").innerHTML = filterControls + table(["Puesto / Depto", "PDF origen", "Rango Salarial", "Requisitos", "Estado", "Acciones"], vRows);
    }
    if (byId("tablaRechazados")) byId("tablaRechazados").innerHTML = table(["Candidato", "Vacante Aplicada", "Score", "Motivo de Descarte", "Fecha"], rRows);
    if (byId("tablaLogs")) {
      const logsHtml = l.length
        ? table(["Evento / Operación", "Actor / Usuario", "Detalle", "Fecha de Registro"], lRows)
        : `<div class="p-16 text-center space-y-3">
            <p class="text-slate-400 font-medium">Sin eventos registrados todavía.</p>
            <p class="text-sm text-slate-500 max-w-lg mx-auto">Aquí verá decisiones de IA, postulaciones, rechazos y vacantes cargadas en el sistema.</p>
          </div>`;
      byId("tablaLogs").innerHTML = logsHtml;
    }
    setText("logsCount", `${l.length} evento(s) registrados`);
    
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
                  ${esc(x.evento || x.decision || x.accion || "-")}
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

  function resolvePsychometricPublicUrl() {
    if (CFG.PSYCHOMETRIC_PUBLIC_URL) return CFG.PSYCHOMETRIC_PUBLIC_URL.replace(/\/$/, "");
    const base = window.location.href.replace(/[^/]*$/, "");
    return `${base}evaluacion-candidato.html`;
  }

  async function prepararPsicometrico(candidatoId) {
    const c = (state.datasets.candidatos || []).find((x) => x.id === candidatoId);
    if (!c) {
      alert("Candidato no encontrado");
      return;
    }
    const setupUrl = CFG.PSYCHOMETRIC_SETUP_WEBHOOK_URL || "";
    if (!setupUrl) {
      alert("Configura PSYCHOMETRIC_SETUP_WEBHOOK_URL en runtime-config.js");
      return;
    }

    try {
      const setupResp = await fetch(setupUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidatoId,
          codigoPuesto: c.codigo_puesto || "",
          email: c.email || c.correo || "",
          nombre: c.nombre_completo || c.nombre || "",
          publicBaseUrl: resolvePsychometricPublicUrl(),
        }),
      });
      const setupData = await setupResp.json().catch(() => ({}));
      if (!setupResp.ok || !setupData.ok) {
        throw new Error(setupData.error || setupData.detail || `HTTP ${setupResp.status}`);
      }

      const link =
        setupData.link ||
        `${resolvePsychometricPublicUrl()}?token=${encodeURIComponent(setupData.token || "")}`;

      const emailUrl = CFG.EMAIL_WEBHOOK_URL || "";
      const to = (CFG.CANDIDATE_RESULT_EMAIL_OVERRIDE || c.email || c.correo || "").trim();
      if (emailUrl && to && link.includes("token=")) {
        await fetch(emailUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to,
            subject: "Ma Baker and Chef — Evaluación psicométrica",
            text: `Hola ${c.nombre_completo || c.nombre || ""},\n\nCompleta tu evaluación en:\n${link}\n\nEquipo de Reclutamiento`,
            html: `<p>Hola <strong>${esc(c.nombre_completo || c.nombre || "Candidato")}</strong>,</p><p>Completa tu evaluación psicométrica aquí:</p><p><a href="${esc(link)}">Abrir evaluación</a></p>`,
            meta: { tipo: "psicometrico_link", candidato_id: candidatoId },
          }),
        }).catch(() => null);
      }

      alert(`Link psicométrico generado.\n\n${link}`);
      await reloadCurrentRoleData();
    } catch (e) {
      alert(`Error al generar link: ${e.message || e}`);
    }
  }

  async function avanzarAMedico(candidatoId) {
    if (!window.MB_CANDIDATES) {
      alert("Falta candidates-api.js");
      return;
    }
    try {
      await window.MB_CANDIDATES.patchCandidate(candidatoId, { fase_actual: "espera_medico" });
      await reloadCurrentRoleData();
      alert("Candidato enviado a evaluación médica.");
    } catch (e) {
      alert(`No se pudo avanzar fase: ${e.message || e}`);
    }
  }

  async function loadJefe(session) {
    const d = (session.departamento || "").toLowerCase();
    const list = window.MB_CANDIDATES && localStorage.getItem("mb_token")
      ? await window.MB_CANDIDATES.listCandidates().catch(() => [])
      : await supaGet(candidateEndpointForRole("jefe")).catch(() => []);
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

  function fieldTextFromDb(val) {
    if (Array.isArray(val)) return val.filter(Boolean).join(", ");
    if (val == null) return "";
    return String(val);
  }

  function renderTagList(containerId, csv, emptyLabel) {
    const el = byId(containerId);
    if (!el) return;
    const items = fieldTextFromDb(csv)
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    el.innerHTML = items.length
      ? items.map((c) => `<span class="px-2 py-1 bg-white/10 text-slate-200 rounded text-[10px] font-bold">${esc(c)}</span>`).join("")
      : `<span class="text-slate-500 text-xs italic">${emptyLabel}</span>`;
  }

  function verDescripcionVacante(id) {
    const v = (state.datasets.vacantes || []).find((x) => String(x.id) === String(id));
    if (!v) return;
    state.viewingVacanteId = v.id;
    setText("verV_codigo", v.codigo_puesto || "—");
    setText("verV_titulo", v.nombre_puesto || "Sin nombre");
    setText("verV_depto", v.departamento || "General");
    setText("verV_escolaridad", v.escolaridad_minima || "Sin especificar");
    setText("verV_exp", `${v.experiencia_minima_anios || 0} años`);
    setText("verV_edad", `${v.edad_minima || 18} - ${v.edad_maxima || 55} años`);
    setText("verV_sueldo", `${fmtMoney(v.sueldo_minimo)} - ${fmtMoney(v.sueldo_maximo)}`);
    setText("verV_archivo", v.nombre_archivo_fuente || (v.fuente_pdf ? "PDF" : "Manual"));
    const descEl = byId("verV_desc");
    if (descEl) {
      descEl.textContent = v.descripcion_completa || v.descripcion_puesto || "Sin descripción disponible.";
    }
    renderTagList("verV_conocimientos", v.conocimientos_tecnicos, "No especificados");
    renderTagList("verV_competencias", v.competencias_clave, "No especificadas");
    const st = byId("verV_status");
    if (st) {
      const active = v.activo !== false;
      st.textContent = active ? "ACTIVA" : "PAUSADA";
      st.className = active
        ? "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400"
        : "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-500/20 text-slate-400";
    }
    const modal = byId("modalVerVacante");
    if (modal) modal.classList.remove("hidden");
  }

  function cerrarModalVerVacante() {
    const modal = byId("modalVerVacante");
    if (modal) modal.classList.add("hidden");
    state.viewingVacanteId = null;
  }

  function editarVacanteDesdeVer() {
    const id = state.viewingVacanteId;
    cerrarModalVerVacante();
    if (id) editarVacante(id);
  }

  function toggleSubirVacantesPDFs() {
    const section = byId("vacantesUploadSection");
    if (!section) return;
    const wasHidden = section.classList.contains("hidden");
    section.classList.toggle("hidden");
    if (wasHidden) section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function autoGrowTextarea(el) {
    if (!el) return;
    el.style.height = "auto";
    const minH = parseInt(el.dataset.minHeight || "48", 10);
    el.style.height = Math.max(el.scrollHeight, minH) + "px";
  }

  function refreshVacanteAutoGrow() {
    document.querySelectorAll("#modalVacante .vacante-autogrow").forEach((el) => {
      autoGrowTextarea(el);
      if (!el.dataset.autogrowBound) {
        el.dataset.autogrowBound = "1";
        el.addEventListener("input", () => autoGrowTextarea(el));
      }
    });
  }

  function editarVacante(id) {
    const v = (state.datasets.vacantes || []).find((x) => String(x.id) === String(id));
    if (!v) return;
    state.currentVacanteId = v.id;
    setInput("editV_nombre", v.nombre_puesto);
    setInput("editV_codigo", v.codigo_puesto || "");
    setInput("editV_archivo", v.nombre_archivo_fuente || "");
    setInput("editV_depto", v.departamento);
    setInput("editV_sMin", v.sueldo_minimo);
    setInput("editV_sMax", v.sueldo_maximo);
    setInput("editV_escolaridad", v.escolaridad_minima || "Sin especificar");
    setInput("editV_exp", v.experiencia_minima_anios || 0);
    setInput("editV_edadMin", v.edad_minima ?? 18);
    setInput("editV_edadMax", v.edad_maxima ?? 55);
    setInput("editV_desc", v.descripcion_completa || v.descripcion_puesto || "");
    setInput("editV_conocimientos", fieldTextFromDb(v.conocimientos_tecnicos));
    setInput("editV_competencias", fieldTextFromDb(v.competencias_clave));
    const chk = byId("editV_activo");
    if (chk) chk.checked = v.activo !== false;
    const modal = byId("modalVacante");
    if (modal) modal.classList.remove("hidden");
    requestAnimationFrame(refreshVacanteAutoGrow);
  }

  async function guardarCambiosVacante() {
    if (!state.currentVacanteId) return;
    const payload = {
      codigo_puesto: getInput("editV_codigo"),
      nombre_puesto: getInput("editV_nombre"),
      nombre_archivo_fuente: getInput("editV_archivo"),
      departamento: getInput("editV_depto"),
      sueldo_minimo: numberOrNull(getInput("editV_sMin")),
      sueldo_maximo: numberOrNull(getInput("editV_sMax")),
      escolaridad_minima: getInput("editV_escolaridad"),
      experiencia_minima_anios: numberOrNull(getInput("editV_exp")) || 0,
      edad_minima: numberOrNull(getInput("editV_edadMin")) ?? 18,
      edad_maxima: numberOrNull(getInput("editV_edadMax")) ?? 55,
      descripcion_completa: getInput("editV_desc"),
      descripcion_puesto: getInput("editV_desc"),
      conocimientos_tecnicos: getInput("editV_conocimientos"),
      competencias_clave: getInput("editV_competencias"),
      activo: !!(byId("editV_activo") && byId("editV_activo").checked),
    };
    const normalized = normalizeSavePayload(payload);
    try {
      if (window.MB_VACANTES) {
        await window.MB_VACANTES.updateVacante(state.currentVacanteId, normalized);
      } else {
        await supaPatch(`/rest/v1/catalogo_puestos?id=eq.${state.currentVacanteId}`, normalized);
      }
      cerrarModalVacante();
      await reloadCurrentRoleData();
      alert("Vacante actualizada correctamente.");
    } catch (e) {
      alert("No se pudo guardar la vacante: " + (e.message || e));
    }
  }

  async function toggleVacanteActiva(id, nextActive) {
    try {
      if (window.MB_VACANTES) {
        await window.MB_VACANTES.updateVacante(id, { activo: !!nextActive });
      } else {
        await supaPatch(`/rest/v1/catalogo_puestos?id=eq.${encodeURIComponent(id)}`, {
          activo: !!nextActive,
        });
      }
      await reloadCurrentRoleData();
    } catch (e) {
      console.error("No se pudo cambiar estado de vacante:", e);
      alert("No se pudo actualizar el estado de la vacante.");
      await reloadCurrentRoleData();
    }
  }

  function initVacantesUploadWidget() {
    if (!window.MB_VACANTES_UPLOAD || !byId("vacantesDropZone")) return;
    window.MB_VACANTES_UPLOAD.init({
      escapeHTML: esc,
      folderInputId: "vacantesFolderInput",
      onComplete: async () => {
        await reloadCurrentRoleData();
        setVacanteFilter("activas");
      },
    });
  }

  function abrirModalRechazado(id) {
    const x = (state.datasets.rechazados || []).find((r) => String(r.id) === String(id));
    if (!x) return;
    const score = x.match_score ?? x.decision_agente?.score ?? "—";
    const reasoning = x.decision_agente?.reasoning || x.razon_rechazo || "Sin detalle";
    const escolaridad = x.escolaridad || "—";
    const empresa = x.empresa_1 || "—";
    const curpRfc = (x.curp && x.rfc) ? "Sí (+5 pts)" : "No (+0 pts)";
    alert(
      `Evaluación de postulación\n\n` +
      `Candidato: ${resolveCandidateName(x)}\n` +
      `Score final: ${score}/100 (umbral para avanzar: 80)\n\n` +
      `Desglose aproximado del score:\n` +
      `• Base: 50 pts\n` +
      `• Escolaridad (${escolaridad}): +10 si Preparatoria/Técnico, +20 si Licenciatura\n` +
      `• Experiencia (${empresa}): +15 primera empresa\n` +
      `• CURP + RFC completos: ${curpRfc}\n\n` +
      `Decisión: ${x.decision_agente?.decision || "ARCHIVE"}\n` +
      `Motivo: ${reasoning}\n\n` +
      `Tip: RRHH puede promover manualmente un caso para revisar fases siguientes.`
    );
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
                                        <span class="text-xs font-black text-slate-200 uppercase tracking-wide font-mono">Reactivo ${ans.numero || (idx + 1)}</span>
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
                                <span class="text-xs font-black text-slate-200 uppercase tracking-wide block leading-none">Puntuación</span>
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

  window.publicarVacanteDesdePanel = publicarVacanteDesdePanel;
  window.publicarVacantesSeleccionadas = publicarVacantesSeleccionadas;
  window.togglePublicarTodos = togglePublicarTodos;
  window.renderPublicarPanel = renderPublicarPanel;
  window.state = state;
  window.cargarEvaluacionesCandidato = cargarEvaluacionesCandidato;
  window.initDashboard = initDashboard;
  window.reloadCurrentRoleData = reloadCurrentRoleData;
  window.renderRRHHTables = renderRRHHTables;
  window.activarPanel = activarPanel;
  window.setVacanteFilter = setVacanteFilter;
  window.toggleSidebar = toggleSidebar;
  window.editarVacante = editarVacante;
  window.verDescripcionVacante = verDescripcionVacante;
  window.cerrarModalVerVacante = cerrarModalVerVacante;
  window.editarVacanteDesdeVer = editarVacanteDesdeVer;
  window.toggleSubirVacantesPDFs = toggleSubirVacantesPDFs;
  window.toggleVacanteActiva = toggleVacanteActiva;
  window.guardarCambiosVacante = guardarCambiosVacante;
  window.cerrarModalVacante = cerrarModalVacante;
  window.abrirModalRechazado = abrirModalRechazado;
  window.abrirModalCandidato = abrirModalCandidato;
  window.guardarCambiosCandidato = guardarCambiosCandidato;
  window.cerrarModalCandidato = cerrarModalCandidato;
  window.prepararPsicometrico = prepararPsicometrico;
  window.avanzarAMedico = avanzarAMedico;
  window.logout = logout;
})();
