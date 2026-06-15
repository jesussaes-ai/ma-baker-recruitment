/**
 * Carga masiva de descripciones de puesto (PDF, Microsoft, Google export, OpenDocument, texto).
 */
(function () {
  function stripParsingNoise(text) {
    return String(text || "")
      .replace(/(?:nombre del puesto|puesto|cargo|posición)\s*:\s*/gi, "")
      .replace(/(?:departamento|área|sección)\s*:\s*/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function inferDepartamento(nombre, text) {
    const blob = `${nombre} ${text}`.toLowerCase();
    const map = [
      ["Producción", /producci|panader|reposter|horno|masa|pastel/],
      ["Ventas", /ventas|comercial|vendedor|mostrador|tienda/],
      ["Logística", /logíst|almac|invent|bodega|entrega|chofer|repart/],
      ["Administración", /admin|contab|finanz|recursos humanos|rrhh|nómina/],
      ["Calidad", /calidad|inocuidad|sgi|haccp|iso/],
      ["Mantenimiento", /manten|mecánic|electric/],
      ["Cocina", /cocin|chef|mesero|restaur|salón|barista/],
    ];
    for (const [depto, re] of map) {
      if (re.test(blob)) return depto;
    }
    const dMatch = text.match(/(?:departamento|área|sección|unidad)[:\s]+([^\n\r.]+)/i);
    return dMatch ? dMatch[1].trim().substring(0, 80) : "General";
  }

  function extractPuestoData(text, fileName) {
    const raw = String(text || "").trim();
    const baseName = (window.MB_VACANTE_DOCS?.stripFileName || ((n) => n.replace(/\.[^.]+$/i, "").replace(/_/g, " ")))(fileName);

    const nMatch = raw.match(/(?:puesto|cargo|posición|nombre del puesto)[:\s]+([^\n\r.]{3,120})/i);
    let nombre = nMatch ? stripParsingNoise(nMatch[1]) : baseName;
    if (nombre.length < 3) nombre = baseName;

    const depto = inferDepartamento(nombre, raw);

    const eMatch = raw.match(
      /(?:escolaridad|estudios|nivel)[:\s]+(preparatoria|bachillerato|licenciatura|ingeniería|maestría|doctorado|técnico|profesional|carrera|estudiante|pasante|secundaria|primaria)/i
    );
    const escolaridad = eMatch ? eMatch[1].trim() : "Perfil abierto";

    const expMatch = raw.match(/(?:experiencia|antigüedad)[:\s]*(\d+)\s*(?:años|año)/i);
    const experiencia = expMatch ? parseInt(expMatch[1], 10) : 0;

    const sueldoMatch = raw.match(/(?:\$|mxn|bruto|neto|mensual|sueldo|remuneración|oferta|pago)[:\s]*([\d,]{3,8})/gi);
    const sueldos = (sueldoMatch || [])
      .map((s) => parseInt(s.replace(/[^0-9]/g, ""), 10))
      .filter((s) => s >= 1000);
    const sMin = sueldos.length ? Math.min(...sueldos) : 0;
    const sMax = sueldos.length > 1 ? Math.max(...sueldos) : sueldos[0] || 0;

    const edadMatch = raw.match(/(?:edad|rango[:\s]*)(\d{2})\s*(?:a|y|al|-)?\s*(\d{2})?\s*(?:años)/i);
    const edadMin = edadMatch ? parseInt(edadMatch[1], 10) : 18;
    const edadMax = edadMatch?.[2] ? parseInt(edadMatch[2], 10) : 55;

    const software = ["Excel", "SAP", "Office", "Word", "Canvas", "CRM", "Adobe", "Photoshop", "SQL", "Python", "Power BI"];
    const conocimientos = software.filter((s) => new RegExp(s, "i").test(raw));

    const softSkills = [
      "Liderazgo",
      "Comunicación",
      "Trabajo en equipo",
      "Proactivo",
      "Resolución",
      "Creativo",
      "Responsable",
      "Organización",
    ];
    const competencias = softSkills.filter((s) => new RegExp(s, "i").test(raw));

    const codigoMatch = raw.match(/(?:código|clave|id)[:\s]+([A-Z0-9-]{2,20})/i);

    return {
      codigo_puesto: (codigoMatch?.[1] || "VAC-" + Date.now().toString().slice(-6)).toUpperCase(),
      nombre_puesto: nombre.substring(0, 120),
      departamento: depto.substring(0, 80),
      escolaridad_minima: escolaridad,
      edad_minima: edadMin,
      edad_maxima: edadMax,
      experiencia_minima_anios: experiencia,
      sueldo_minimo: sMin,
      sueldo_maximo: sMax,
      descripcion_completa: raw,
      descripcion_puesto: raw,
      activo: false,
      fuente_pdf: true,
      nombre_archivo_fuente: fileName,
      conocimientos_tecnicos: conocimientos.join(", "),
      competencias_clave: competencias.join(", "),
    };
  }

  async function readFileAsText(file) {
    if (!window.MB_VACANTE_DOCS?.extractText) {
      throw new Error("Falta vacante-document-parser.js");
    }
    return window.MB_VACANTE_DOCS.extractText(file);
  }

  function filterSupportedFiles(fileList) {
    const exts = window.MB_VACANTE_DOCS?.ACCEPT_EXTENSIONS || [];
    return Array.from(fileList || []).filter((f) => {
      const name = f.name || "";
      const i = name.lastIndexOf(".");
      const ext = i >= 0 ? name.slice(i + 1).toLowerCase() : "";
      return exts.includes(ext);
    });
  }

  function saveUploadHistory(fileName) {
    try {
      const items = JSON.parse(localStorage.getItem("mb_history_uploads") || "[]");
      items.unshift({ name: fileName, ts: Date.now() });
      localStorage.setItem("mb_history_uploads", JSON.stringify(items.slice(0, 50)));
    } catch (_) {}
  }

  async function processFiles(files, hooks) {
    const list = filterSupportedFiles(files);
    if (!list.length) {
      throw new Error("No hay archivos compatibles. Use PDF, Word, Excel, PowerPoint o exporte desde Google.");
    }
    if (!window.MB_VACANTES?.insertVacante) {
      throw new Error("Inicie sesión como admin o RRHH para cargar vacantes.");
    }

    const stats = { ok: 0, err: 0, results: [] };

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const id = hooks?.idPrefix ? `${hooks.idPrefix}-${i}-${Date.now()}` : `vac-up-${i}-${Date.now()}`;

      hooks?.onStart?.({ file, id, index: i, total: list.length });

      try {
        hooks?.onProgress?.({ file, id, msg: "Leyendo documento...", pct: 25 });
        const text = await readFileAsText(file);

        hooks?.onProgress?.({ file, id, msg: "Extrayendo perfil del puesto...", pct: 55 });
        const data = extractPuestoData(text, file.name);

        hooks?.onProgress?.({ file, id, msg: "Guardando en biblioteca...", pct: 85 });
        await window.MB_VACANTES.insertVacante(data);

        hooks?.onProgress?.({ file, id, msg: "Listo", pct: 100, status: "success" });
        hooks?.onSuccess?.({ file, id, data });
        saveUploadHistory(file.name);
        stats.ok++;
        stats.results.push({ file: file.name, ok: true, puesto: data.nombre_puesto });
      } catch (e) {
        const msg = e.message || String(e);
        hooks?.onProgress?.({ file, id, msg, pct: 100, status: "error" });
        hooks?.onError?.({ file, id, error: e });
        stats.err++;
        stats.results.push({ file: file.name, ok: false, error: msg });
      }
    }

    hooks?.onComplete?.(stats);
    return stats;
  }

  function renderQueueItem(queueEl, name, msg, pct, id, esc, file, theme) {
    const label = window.MB_VACANTE_DOCS?.formatLabel?.(file) || "DOC";
    const row = document.createElement("div");
    row.id = id;
    if (theme === "light") {
      row.className = "glass-panel p-5 rounded-2xl animate-slide-up flex items-center gap-4";
      row.innerHTML = `
        <div class="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 uppercase">${esc(label)}</div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-center mb-1">
            <p class="text-xs font-bold text-slate-700 truncate">${esc(name)}</p>
            <p class="text-[10px] font-black text-slate-400 status-msg capitalize">${esc(msg)}</p>
          </div>
          <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-mabaker-blue transition-all duration-300 fill-bar" style="width:${pct}%"></div>
          </div>
        </div>`;
    } else {
      row.className =
        "p-4 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center gap-4 animate-slide-up";
      row.innerHTML = `
        <div class="size-10 rounded-xl bg-mabaker-blue/10 text-mabaker-blue flex items-center justify-center shrink-0 text-[9px] font-black uppercase">${esc(label)}</div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between gap-2 mb-1">
            <p class="text-xs font-bold text-white truncate">${esc(name)}</p>
            <p class="text-[10px] font-black text-slate-400 status-msg shrink-0">${esc(msg)}</p>
          </div>
          <div class="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-mabaker-blue transition-all duration-300 fill-bar" style="width:${pct}%"></div>
          </div>
        </div>`;
    }
    queueEl.appendChild(row);
  }

  function updateQueueItem(id, msg, pct, status, theme) {
    const el = document.getElementById(id);
    if (!el) return;
    const msgEl = el.querySelector(".status-msg");
    const bar = el.querySelector(".fill-bar");
    if (msgEl) msgEl.textContent = msg;
    if (bar) bar.style.width = `${pct}%`;
    if (status === "error") {
      bar?.classList.remove("bg-mabaker-blue");
      bar?.classList.add("bg-rose-500");
      msgEl?.classList.add(theme === "light" ? "text-rose-500" : "text-rose-400");
    } else if (status === "success") {
      bar?.classList.remove("bg-mabaker-blue");
      bar?.classList.add("bg-emerald-500");
      msgEl?.classList.add(theme === "light" ? "text-emerald-600" : "text-emerald-400");
    }
  }

  function bindDropZone(dropZone, onFiles) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over", "border-mabaker-red/50", "bg-mabaker-red/5");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-over", "border-mabaker-red/50", "bg-mabaker-red/5");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over", "border-mabaker-red/50", "bg-mabaker-red/5");
      onFiles(e.dataTransfer.files);
    });
    dropZone.addEventListener("click", (e) => {
      if (e.target.closest("button[data-upload-action]")) return;
      const fileInput = dropZone.querySelector('input[type="file"]:not([webkitdirectory])');
      if (fileInput) fileInput.click();
    });
  }

  function init(options) {
    const esc = options.escapeHTML || ((v) => String(v ?? ""));
    const queueEl = document.getElementById(options.queueId || "vacantesUploadQueue");
    const summaryEl = document.getElementById(options.summaryId || "vacantesUploadSummary");
    const fileInput = document.getElementById(options.fileInputId || "vacantesFileInput");
    const folderInput = document.getElementById(options.folderInputId || "vacantesFolderInput");
    const dropZone = document.getElementById(options.dropZoneId || "vacantesDropZone");
    if (!queueEl || !fileInput || !dropZone) return;

    const accept = window.MB_VACANTE_DOCS?.ACCEPT_ATTR || fileInput.getAttribute("accept") || "";
    if (accept) fileInput.setAttribute("accept", accept);

    const theme = options.theme || "dark";

    async function handleFiles(files) {
      if (!files?.length) return;
      queueEl.innerHTML = "";
      if (summaryEl) {
        summaryEl.classList.add("hidden");
        summaryEl.innerHTML = "";
      }

      await processFiles(files, {
        idPrefix: "vac-up",
        onStart: ({ file, id }) => renderQueueItem(queueEl, file.name, "Iniciando...", 5, id, esc, file, theme),
        onProgress: ({ id, msg, pct, status }) => updateQueueItem(id, msg, pct, status, theme),
        onComplete: (stats) => {
          if (typeof options.onComplete === "function") {
            options.onComplete(stats);
            return;
          }
          if (!summaryEl) return;
          summaryEl.classList.remove("hidden");
          summaryEl.innerHTML = `
            <p class="text-sm font-bold ${theme === "light" ? "text-slate-800" : "text-white"} mb-2">
              Carga finalizada:
              <span class="text-emerald-500">${stats.ok} exitosos</span>,
              <span class="text-rose-500">${stats.err} errores</span>
            </p>
            <ul class="text-xs text-slate-400 space-y-1 max-h-40 overflow-y-auto">
              ${stats.results
                .map((r) =>
                  r.ok
                    ? `<li class="text-emerald-500/90">✓ ${esc(r.file)} → ${esc(r.puesto)}</li>`
                    : `<li class="text-rose-500/90">✗ ${esc(r.file)}: ${esc(r.error)}</li>`
                )
                .join("")}
            </ul>`;
        },
      });
    }

    bindDropZone(dropZone, handleFiles);
    fileInput.addEventListener("change", (e) => {
      handleFiles(e.target.files);
      e.target.value = "";
    });
    if (folderInput) {
      folderInput.addEventListener("change", (e) => {
        handleFiles(e.target.files);
        e.target.value = "";
      });
    }

    dropZone.querySelectorAll("[data-upload-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.getAttribute("data-upload-action");
        if (action === "files") fileInput.click();
        if (action === "folder" && folderInput) folderInput.click();
      });
    });
  }

  window.MB_VACANTES_UPLOAD = {
    init,
    processFiles,
    extractPuestoData,
    filterSupportedFiles,
  };
})();
