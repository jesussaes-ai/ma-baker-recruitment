/**
 * Carga masiva de descripciones de puesto (PDF, Microsoft, Google export, OpenDocument, texto).
 */
(function () {
  /** Máximo recomendado por lote (secuencial; evita saturar el navegador). */
  const MAX_BATCH_FILES = 25;
  const MAX_BYTES = 20 * 1024 * 1024;
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

  function buildUniqueCodigoPuesto(nombre, fileName, batchIndex) {
    const fromFile = String(fileName || "")
      .replace(/\.[^.]+$/i, "")
      .replace(/^descripci[oó]n de puesto\s*[-–—:\s]+/i, "")
      .trim();
    const fromNombre = String(nombre || fromFile || "PUESTO").trim();
    const slug = (fromFile || fromNombre)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32)
      .toUpperCase() || "PUESTO";
    const tail =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
        : `${Date.now().toString(36)}${String(batchIndex).padStart(3, "0")}`.toUpperCase();
    return `${slug}-${tail}`.slice(0, 48);
  }

  function extractPuestoData(text, fileName, batchIndex) {
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

    return {
      codigo_puesto: buildUniqueCodigoPuesto(nombre, fileName, batchIndex),
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
    const supported = [];
    const skipped = [];
    Array.from(fileList || []).forEach((f) => {
      const name = f.name || "";
      const i = name.lastIndexOf(".");
      const ext = i >= 0 ? name.slice(i + 1).toLowerCase() : "";
      if (f.size > MAX_BYTES) {
        skipped.push({ name, reason: "Supera 20 MB" });
        return;
      }
      if (exts.includes(ext)) supported.push(f);
      else skipped.push({ name, reason: ext ? `Formato .${ext} no soportado` : "Sin extensión" });
    });
    return { supported, skipped };
  }

  function saveUploadHistory(fileName) {
    try {
      const items = JSON.parse(localStorage.getItem("mb_history_uploads") || "[]");
      items.unshift({ name: fileName, ts: Date.now() });
      localStorage.setItem("mb_history_uploads", JSON.stringify(items.slice(0, 50)));
    } catch (_) {}
  }

  function friendlyUploadError(err) {
    const msg = err?.message || String(err || "");
    if (/duplicate key.*codigo_puesto/i.test(msg)) {
      return "Código interno duplicado. Reintente subir el archivo.";
    }
    return msg;
  }

  async function insertVacanteUnique(data, file, batchIndex) {
    let payload = { ...data };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await window.MB_VACANTES.insertVacante(payload);
        return payload;
      } catch (e) {
        if (attempt < 2 && /duplicate key.*codigo_puesto/i.test(e.message || "")) {
          payload = {
            ...payload,
            codigo_puesto: buildUniqueCodigoPuesto(payload.nombre_puesto, file?.name, batchIndex + attempt + 1),
          };
          continue;
        }
        throw e;
      }
    }
    return payload;
  }

  async function processFiles(files, hooks) {
    const { supported: list, skipped } = filterSupportedFiles(files);
    if (!list.length) {
      const hint = skipped.length
        ? `Ningún archivo válido. ${skipped.length} omitido(s): use .docx, .pdf, .xlsx, etc. (máx. 20 MB c/u).`
        : "No hay archivos compatibles. Use PDF, Word (.docx), Excel, PowerPoint o exporte desde Google.";
      throw new Error(hint);
    }
    if (list.length > MAX_BATCH_FILES) {
      throw new Error(
        `Seleccionó ${list.length} archivos. Suba hasta ${MAX_BATCH_FILES} por lote; repita para el resto.`
      );
    }
    if (!window.MB_VACANTES?.insertVacante) {
      throw new Error("Inicie sesión como admin o RRHH para cargar vacantes.");
    }

    const stats = { ok: 0, err: 0, results: [], skipped: skipped.slice() };

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const id = hooks?.idPrefix ? `${hooks.idPrefix}-${i}-${Date.now()}` : `vac-up-${i}-${Date.now()}`;

      hooks?.onStart?.({ file, id, index: i, total: list.length });

      try {
        hooks?.onProgress?.({ file, id, msg: "Leyendo documento...", pct: 25 });
        const text = await readFileAsText(file);

        hooks?.onProgress?.({ file, id, msg: "Extrayendo perfil del puesto...", pct: 55 });
        const data = extractPuestoData(text, file.name, i);

        hooks?.onProgress?.({ file, id, msg: "Guardando en biblioteca...", pct: 85 });
        const saved = await insertVacanteUnique(data, file, i);

        hooks?.onProgress?.({ file, id, msg: "Listo", pct: 100, status: "success" });
        hooks?.onSuccess?.({ file, id, data: saved });
        saveUploadHistory(file.name);
        stats.ok++;
        stats.results.push({ file: file.name, ok: true, puesto: saved.nombre_puesto });
      } catch (e) {
        const msg = friendlyUploadError(e);
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
      onFiles(e.dataTransfer.files, "arrastre");
    });
    dropZone.addEventListener("click", (e) => {
      if (e.target.closest("button[data-upload-action]")) return;
      if (e.target.closest("[data-upload-preview]")) return;
      const fileInput = dropZone.querySelector('input[type="file"]:not([webkitdirectory])');
      if (fileInput) fileInput.click();
    });
  }

  function folderLabelFromFiles(files) {
    const first = files?.[0];
    if (first?.webkitRelativePath) {
      return first.webkitRelativePath.split("/")[0] || "Carpeta";
    }
    return "Archivos sueltos";
  }

  function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function isSupportedFile(file) {
    const { supported } = filterSupportedFiles([file]);
    return supported.length === 1;
  }

  function fileSkipReason(file) {
    const { skipped } = filterSupportedFiles([file]);
    return skipped[0]?.reason || "No compatible";
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
    const previewEl = document.getElementById(options.previewId || "vacantesUploadPreview");
    let pendingFiles = null;

    async function runUpload(files) {
      if (!files?.length) return;
      if (previewEl) previewEl.classList.add("hidden");
      queueEl.innerHTML = "";
      if (summaryEl) {
        summaryEl.classList.add("hidden");
        summaryEl.innerHTML = "";
      }

      try {
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
            const skippedHtml =
              stats.skipped?.length > 0
                ? `<p class="text-xs text-amber-600 mb-2">${stats.skipped.length} archivo(s) omitido(s) (formato o tamaño).</p>
                   <ul class="text-xs text-amber-700/90 space-y-1 max-h-24 overflow-y-auto mb-2">
                     ${stats.skipped
                       .map((s) => `<li>⊘ ${esc(s.name)} — ${esc(s.reason)}</li>`)
                       .join("")}
                   </ul>`
                : "";
            summaryEl.innerHTML = `
              ${skippedHtml}
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
      } catch (e) {
        const msg = e.message || String(e);
        queueEl.innerHTML = `<div class="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-medium">${esc(msg)}</div>`;
      }
    }

    function showPreview(files, sourceKind) {
      if (!files?.length) return;
      pendingFiles = Array.from(files);
      if (!previewEl) {
        runUpload(files);
        return;
      }

      const isFolder = sourceKind === "carpeta" || pendingFiles.some((f) => f.webkitRelativePath);
      const folderName = isFolder ? folderLabelFromFiles(pendingFiles) : null;
      const valid = pendingFiles.filter((f) => isSupportedFile(f));
      const invalid = pendingFiles.filter((f) => !isSupportedFile(f));

      const light = theme === "light";
      const panelClass = light
        ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        : "rounded-2xl border border-white/10 bg-white/[0.04] p-5";
      const headClass = light ? "text-slate-800" : "text-white";
      const subClass = light ? "text-slate-500" : "text-slate-400";

      const validIndices = pendingFiles
        .map((f, idx) => (isSupportedFile(f) ? idx : -1))
        .filter((i) => i >= 0);
      const defaultChecked = new Set(validIndices.slice(0, MAX_BATCH_FILES));
      const overLimit = valid.length > MAX_BATCH_FILES;

      previewEl.classList.remove("hidden");
      previewEl.setAttribute("data-upload-preview", "1");
      previewEl.innerHTML = `
        <div class="${panelClass}">
          <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest ${subClass} mb-1">
                ${isFolder ? "Vista previa de carpeta" : "Vista previa de archivos"}
              </p>
              <h4 class="text-sm font-extrabold ${headClass}">
                ${isFolder ? esc(folderName) : esc(valid.length + invalid.length + " archivo(s) seleccionados")}
              </h4>
              <p class="text-xs ${subClass} mt-1">
                ${valid.length} compatible(s) · ${invalid.length} omitido(s) · importe máximo ${MAX_BATCH_FILES} por lote
              </p>
              ${overLimit ? `<p class="text-xs font-bold text-amber-600 mt-2">Hay ${valid.length} archivos válidos. Marque hasta ${MAX_BATCH_FILES}; repita el lote para el resto.</p>` : ""}
            </div>
            <button type="button" data-preview-cancel class="px-3 py-2 rounded-xl text-xs font-bold ${light ? "bg-slate-100 text-slate-600" : "bg-white/10 text-slate-300"}">Cancelar</button>
          </div>
          <div class="max-h-56 overflow-y-auto rounded-xl border ${light ? "border-slate-100" : "border-white/10"} divide-y ${light ? "divide-slate-100" : "divide-white/5"}">
            ${pendingFiles
              .map((file, idx) => {
                const ok = isSupportedFile(file);
                const label = window.MB_VACANTE_DOCS?.formatLabel?.(file) || "DOC";
                const path = file.webkitRelativePath || file.name;
                const checked = ok && defaultChecked.has(idx) ? "checked" : "";
                return `
                  <label class="flex items-center gap-3 px-3 py-2.5 ${ok ? "" : "opacity-60"} cursor-${ok ? "pointer" : "not-allowed"}">
                    <input type="checkbox" data-preview-idx="${idx}" ${checked} ${ok ? "" : "disabled"} class="rounded shrink-0 preview-file-cb">
                    <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded ${light ? "bg-slate-100 text-slate-600" : "bg-white/10 text-slate-300"}">${esc(label)}</span>
                    <span class="flex-1 min-w-0 text-xs font-medium truncate ${headClass}" title="${esc(path)}">${esc(path)}</span>
                    <span class="text-[10px] ${subClass} shrink-0">${formatFileSize(file.size)}</span>
                    ${ok ? "" : `<span class="text-[10px] text-rose-500 shrink-0">${esc(fileSkipReason(file))}</span>`}
                  </label>`;
              })
              .join("")}
          </div>
          <div class="flex flex-wrap gap-3 mt-4">
            <button type="button" data-preview-confirm
              class="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest ${valid.length ? "bg-mabaker-red text-white" : "bg-slate-400 text-white cursor-not-allowed"}"
              ${valid.length ? "" : "disabled"}>
              Importar seleccionados (<span data-preview-count>${Math.min(valid.length, MAX_BATCH_FILES)}</span>)
            </button>
            ${isFolder ? `<p class="text-[10px] ${subClass} self-center">Solo se importan los archivos marcados (.docx, .pdf, etc.)</p>` : ""}
          </div>
        </div>`;

      const updateCount = () => {
        const checked = [...previewEl.querySelectorAll("[data-preview-idx]:checked")];
        const countEl = previewEl.querySelector("[data-preview-count]");
        if (countEl) countEl.textContent = String(checked.length);
        const btn = previewEl.querySelector("[data-preview-confirm]");
        if (btn) {
          btn.disabled = checked.length === 0 || checked.length > MAX_BATCH_FILES;
        }
      };

      previewEl.querySelectorAll(".preview-file-cb").forEach((cb) => {
        cb.addEventListener("change", () => {
          const checked = [...previewEl.querySelectorAll("[data-preview-idx]:checked")];
          if (checked.length > MAX_BATCH_FILES) {
            cb.checked = false;
            alert(`Solo puede importar ${MAX_BATCH_FILES} archivos por lote. Desmarque uno o importe en partes.`);
          }
          updateCount();
        });
      });

      updateCount();

      previewEl.querySelector("[data-preview-cancel]")?.addEventListener("click", () => {
        pendingFiles = null;
        previewEl.classList.add("hidden");
        previewEl.innerHTML = "";
      });

      previewEl.querySelector("[data-preview-confirm]")?.addEventListener("click", () => {
        const selected = [...previewEl.querySelectorAll("[data-preview-idx]:checked")]
          .map((cb) => pendingFiles[Number(cb.getAttribute("data-preview-idx"))])
          .filter(Boolean);
        if (!selected.length) return;
        if (selected.length > MAX_BATCH_FILES) {
          alert(`Seleccionó ${selected.length} archivos. Importe hasta ${MAX_BATCH_FILES} por lote.`);
          return;
        }
        const dt = new DataTransfer();
        selected.forEach((f) => dt.items.add(f));
        runUpload(dt.files);
        pendingFiles = null;
      });
    }

    bindDropZone(dropZone, showPreview);
    fileInput.addEventListener("change", (e) => {
      showPreview(e.target.files, "archivos");
      e.target.value = "";
    });
    if (folderInput) {
      folderInput.addEventListener("change", (e) => {
        showPreview(e.target.files, "carpeta");
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
    MAX_BATCH_FILES,
    MAX_BYTES,
  };
})();
