/**
 * Carga de descripciones de puesto (PDF) reutilizable en dashboards.
 */
(function () {
  function extractPuestoData(text, fileName) {
    const nMatch = text.match(/(?:puesto|cargo|posición|nombre del puesto)[:\s]+([^\n\r.]+)/i);
    const nombre = nMatch ? nMatch[1].trim() : fileName.replace(".pdf", "").replace(/_/g, " ");

    const dMatch = text.match(/(?:departamento|área|sección|unidad)[:\s]+([^\n\r.]+)/i);
    const depto = dMatch ? dMatch[1].trim() : "General";

    const eMatch = text.match(
      /(?:escolaridad|estudios|nivel)[:\s]+(preparatoria|bachillerato|licenciatura|ingeniería|maestría|doctorado|técnico|profesional|carrera|estudiante|pasante)/i
    );
    const escolaridad = eMatch ? eMatch[1].trim() : "Perfil Abierto";

    const expMatch = text.match(/(?:experiencia|antigüedad)[:\s]*(\d+)\s*(?:años|año|años de exp)/i);
    const experiencia = expMatch ? parseInt(expMatch[1], 10) : 0;

    const sueldoMatch = text.match(/(?:\$|bruto|neto|mensual|sueldo|remuneración|oferta|pago)[:\s]*([\d,]{4,7})/gi);
    const sueldos = (sueldoMatch || [])
      .map((s) => parseInt(s.replace(/[^0-9]/g, ""), 10))
      .filter((s) => s > 0);
    const sMin = sueldos.length ? Math.min(...sueldos) : 0;
    const sMax = sueldos.length > 1 ? Math.max(...sueldos) : sueldos[0] || 0;

    const edadMatch = text.match(/(?:edad|rango[:\s]*)(\d+)\s*(?:a|y|al|a los)?\s*(\d+)?\s*(?:años)/i);
    const edadMin = edadMatch ? parseInt(edadMatch[1], 10) : 18;
    const edadMax = edadMatch?.[2] ? parseInt(edadMatch[2], 10) : 55;

    const software = ["Excel", "SAP", "Office", "Canvas", "CRM", "Adobe", "Photoshop", "SQL", "Python"];
    const conocimientos = software.filter((s) => new RegExp(s, "i").test(text));

    const softSkills = [
      "Liderazgo",
      "Comunicación",
      "Trabajo en equipo",
      "Proactivo",
      "Resolución",
      "Creativo",
      "Responsable",
    ];
    const competencias = softSkills.filter((s) => new RegExp(s, "i").test(text));

    return {
      codigo_puesto: (
        text.match(/(?:código|clave)[:\s]+([A-Z0-9-]+)/i)?.[1] ||
        "GEN-" + Date.now().toString().slice(-4)
      ).toUpperCase(),
      nombre_puesto: nombre.substring(0, 100),
      departamento: depto.substring(0, 80),
      escolaridad_minima: escolaridad,
      edad_minima: edadMin,
      edad_maxima: edadMax,
      experiencia_minima_anios: experiencia,
      sueldo_minimo: sMin,
      sueldo_maximo: sMax,
      descripcion_completa: text.trim(),
      descripcion_puesto: text.trim(),
      activo: true,
      fuente_pdf: true,
      nombre_archivo_fuente: fileName,
      conocimientos_tecnicos: conocimientos.join(", "),
      competencias_clave: competencias.join(", "),
    };
  }

  async function readFileAsText(file) {
    if (!window.pdfjsLib) throw new Error("PDF.js no cargado");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function () {
        try {
          const typedarray = new Uint8Array(this.result);
          const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
          }
          resolve(fullText);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function renderQueueItem(queueEl, name, msg, pct, id, esc) {
    const row = document.createElement("div");
    row.id = id;
    row.className =
      "p-4 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center gap-4";
    row.innerHTML = `
      <div class="size-10 rounded-xl bg-mabaker-blue/10 text-mabaker-blue flex items-center justify-center shrink-0">PDF</div>
      <div class="flex-1 min-w-0">
        <div class="flex justify-between gap-2 mb-1">
          <p class="text-xs font-bold text-white truncate">${esc(name)}</p>
          <p class="text-[10px] font-black text-slate-400 status-msg">${esc(msg)}</p>
        </div>
        <div class="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div class="h-full bg-mabaker-blue transition-all duration-500 fill-bar" style="width:${pct}%"></div>
        </div>
      </div>`;
    queueEl.appendChild(row);
  }

  function updateQueueItem(id, msg, pct, status) {
    const el = document.getElementById(id);
    if (!el) return;
    const msgEl = el.querySelector(".status-msg");
    const bar = el.querySelector(".fill-bar");
    if (msgEl) msgEl.textContent = msg;
    if (bar) bar.style.width = `${pct}%`;
    if (status === "error") {
      bar?.classList.replace("bg-mabaker-blue", "bg-rose-500");
      msgEl?.classList.add("text-rose-400");
    } else if (status === "success") {
      bar?.classList.replace("bg-mabaker-blue", "bg-emerald-500");
      msgEl?.classList.add("text-emerald-400");
    }
  }

  function init(options) {
    const esc = options.escapeHTML || ((v) => String(v ?? ""));
    const queueEl = document.getElementById(options.queueId || "vacantesUploadQueue");
    const summaryEl = document.getElementById(options.summaryId || "vacantesUploadSummary");
    const fileInput = document.getElementById(options.fileInputId || "vacantesFileInput");
    const dropZone = document.getElementById(options.dropZoneId || "vacantesDropZone");
    if (!queueEl || !fileInput || !dropZone) return;

    async function handleFiles(files) {
      if (!files?.length) return;
      if (!window.MB_VACANTES?.insertVacante) {
        alert("Falta vacantes-api.js o sesión no iniciada.");
        return;
      }

      queueEl.innerHTML = "";
      if (summaryEl) summaryEl.classList.add("hidden");
      let ok = 0;
      let err = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = `vac-up-${i}-${Date.now()}`;
        renderQueueItem(queueEl, file.name, "Analizando PDF...", 15, id, esc);

        try {
          const text = await readFileAsText(file);
          updateQueueItem(id, "Extrayendo perfil...", 45, "loading");
          await new Promise((r) => setTimeout(r, 400));
          const data = extractPuestoData(text, file.name);
          updateQueueItem(id, "Guardando vacante...", 80, "loading");
          await window.MB_VACANTES.insertVacante(data);
          updateQueueItem(id, "Completado", 100, "success");
          ok++;
        } catch (e) {
          updateQueueItem(id, e.message || "Error", 100, "error");
          err++;
        }
      }

      if (summaryEl) {
        summaryEl.classList.remove("hidden");
        summaryEl.innerHTML = `
          <p class="text-sm font-bold text-white">Carga finalizada: <span class="text-emerald-400">${ok} exitosos</span>, <span class="text-rose-400">${err} errores</span></p>`;
      }
      if (typeof options.onComplete === "function") options.onComplete({ ok, err });
    }

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("border-mabaker-red/50", "bg-mabaker-red/5");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("border-mabaker-red/50", "bg-mabaker-red/5");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("border-mabaker-red/50", "bg-mabaker-red/5");
      handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener("change", (e) => {
      handleFiles(e.target.files);
      e.target.value = "";
    });
  }

  window.MB_VACANTES_UPLOAD = { init, extractPuestoData };
})();
