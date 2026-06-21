/**
 * Panel Fase 6 — Contratación (uniforme, EPP, firmas)
 * Ma Baker and Chef | RRHH / Admin
 */
(function () {
  const CFG = window.MB_CONFIG || {};
  const esc = CFG.escapeHTML || ((v) => String(v ?? ""));

  const CHECKS = [
    { key: "entrega_uniforme", label: "Entrega de uniforme", icon: "👔" },
    { key: "entrega_epp", label: "Entrega de EPP", icon: "🦺" },
    { key: "firma_reglamento", label: "Firma de reglamento interno", icon: "📋" },
    { key: "firma_confidencialidad", label: "Firma de confidencialidad", icon: "🔒" },
  ];

  const state = {
    candidatoId: null,
    checks: {},
    fecha: "",
  };

  function progress(c) {
    const ok = CHECKS.filter((ch) => c[ch.key] === true).length;
    return { ok, total: CHECKS.length, pct: Math.round((ok / CHECKS.length) * 100) };
  }

  function isComplete(c) {
    return CHECKS.every((ch) => c[ch.key] === true);
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function renderContratacionPanel(candidates) {
    const grid = document.getElementById("contratacionGrid");
    const tabla = document.getElementById("contratacionCompletados");
    const stPend = document.getElementById("statContratacionPend");
    const stDone = document.getElementById("statContratacionDone");
    if (!grid) return;

    const list = (candidates || []).filter((c) =>
      ["listo_para_contrato", "contratado"].includes(c.fase_actual || "")
    );
    const pend = list.filter((c) => c.fase_actual === "listo_para_contrato");
    const done = list.filter((c) => c.fase_actual === "contratado");

    if (stPend) stPend.textContent = String(pend.length);
    if (stDone) stDone.textContent = String(done.length);

    if (!pend.length) {
      grid.innerHTML =
        '<div class="col-span-full p-16 text-center rounded-[2rem] border border-white/5 bg-white/[0.02]"><div class="text-5xl mb-4">✅</div><h4 class="text-white font-black text-xl">Sin contrataciones pendientes</h4><p class="text-slate-400 text-sm mt-2">Los candidatos aparecerán aquí cuando Seguridad e Higiene los marque como listos para contrato.</p></div>';
    } else {
      grid.innerHTML = pend
        .map((c) => {
          const p = progress(c);
          const col = p.pct === 100 ? "#10B981" : p.pct >= 50 ? "#F59E0B" : "#EF4444";
          const checklist = CHECKS.map(
            (ch) =>
              `<li class="flex items-center gap-2 text-xs text-slate-300"><span>${c[ch.key] ? "✅" : "⏳"}</span>${esc(ch.label)}</li>`
          ).join("");
          return `<article class="glass-panel rounded-[2rem] p-6 border border-white/5 space-y-4">
            <div class="flex justify-between items-start gap-3">
              <div>
                <h4 class="font-black text-white text-lg">${esc(c.nombre_completo || c.nombre || "—")}</h4>
                <p class="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-1">${esc(c.nombre_puesto || c.codigo_puesto || "—")}</p>
              </div>
              <span class="text-[10px] font-black px-2.5 py-1 rounded-full" style="background:${col}22;color:${col}">${p.ok}/${p.total}</span>
            </div>
            <div class="h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full rounded-full transition-all" style="width:${p.pct}%;background:${col}"></div></div>
            <ul class="space-y-1.5">${checklist}</ul>
            <button type="button" class="w-full py-3 rounded-xl bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-xs font-black uppercase tracking-widest hover:bg-fuchsia-500 hover:text-white transition-all" data-contratacion-open="${esc(c.id)}">Gestionar contratación</button>
          </article>`;
        })
        .join("");
    }

    if (tabla) {
      tabla.innerHTML = !done.length
        ? '<div class="p-12 text-center text-slate-500 text-sm">Aún no hay candidatos contratados en el sistema.</div>'
        : `<table class="w-full text-left text-sm">
          <thead><tr class="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/5">
            <th class="px-6 py-4">Candidato</th><th class="px-6 py-4">Puesto</th><th class="px-6 py-4">Fecha</th><th class="px-6 py-4">Estado</th>
          </tr></thead>
          <tbody>${done
            .map(
              (c) => `<tr class="border-b border-white/5 hover:bg-white/[0.02]">
              <td class="px-6 py-4 font-bold text-white">${esc(c.nombre_completo || "—")}</td>
              <td class="px-6 py-4 text-slate-300">${esc(c.nombre_puesto || "—")}</td>
              <td class="px-6 py-4 text-slate-400">${esc(c.fecha_contratacion || "—")}</td>
              <td class="px-6 py-4"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">Contratado</span></td>
            </tr>`
            )
            .join("")}</tbody></table>`;
    }
  }

  function bindContratacionActions() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-contratacion-open]");
      if (!btn) return;
      e.preventDefault();
      openContratacionModal(btn.getAttribute("data-contratacion-open"));
    });

    const saveBtn = document.getElementById("btnGuardarContratacion");
    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = "1";
      saveBtn.addEventListener("click", () => saveContratacion(false));
    }

    const finalizeBtn = document.getElementById("btnFinalizarContratacion");
    if (finalizeBtn && !finalizeBtn.dataset.bound) {
      finalizeBtn.dataset.bound = "1";
      finalizeBtn.addEventListener("click", () => saveContratacion(true));
    }

    const closeBtn = document.getElementById("btnCerrarModalContratacion");
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = "1";
      closeBtn.addEventListener("click", closeContratacionModal);
    }
  }

  function openContratacionModal(id) {
    const modal = document.getElementById("modalContratacion");
    if (!modal || !id) return;

    const candidates = window.__MB_CONTRATACION_CANDIDATES__ || [];
    const c = candidates.find((x) => String(x.id) === String(id));
    if (!c) return;

    state.candidatoId = id;
    state.fecha = c.fecha_contratacion || todayIso();
    CHECKS.forEach((ch) => {
      state.checks[ch.key] = c[ch.key] === true;
    });

    const nom = document.getElementById("contratacionCandidatoNombre");
    const hidden = document.getElementById("contratacionCandidatoId");
    const fechaInput = document.getElementById("contratacionFecha");
    if (nom) nom.textContent = c.nombre_completo || c.nombre || "Candidato";
    if (hidden) hidden.value = id;
    if (fechaInput) fechaInput.value = state.fecha;

    CHECKS.forEach((ch) => pintarCheck(ch.key, state.checks[ch.key]));

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  function closeContratacionModal() {
    const modal = document.getElementById("modalContratacion");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    state.candidatoId = null;
  }

  function pintarCheck(key, val) {
    const row = document.querySelector(`[data-contratacion-check="${key}"]`);
    if (!row) return;
    row.querySelectorAll("[data-val]").forEach((btn) => {
      const isYes = btn.getAttribute("data-val") === "1";
      const active = val === true && isYes;
      const inactive = val === false && !isYes;
      btn.classList.toggle("bg-emerald-500/30", active);
      btn.classList.toggle("border-emerald-400", active);
      btn.classList.toggle("text-emerald-200", active);
      btn.classList.toggle("bg-rose-500/30", inactive && !isYes);
      btn.classList.toggle("border-rose-400", inactive && !isYes);
      btn.classList.toggle("text-rose-200", inactive && !isYes);
    });
  }

  function setCheck(key, val) {
    state.checks[key] = val;
    pintarCheck(key, val);
  }

  async function saveContratacion(finalizar) {
    if (!state.candidatoId || !window.MB_CANDIDATES) return;

    if (CHECKS.some((ch) => state.checks[ch.key] !== true)) {
      if (finalizar) {
        alert("Complete los cuatro puntos de contratación antes de finalizar.");
        return;
      }
    }

    const fechaInput = document.getElementById("contratacionFecha");
    const fecha = (fechaInput && fechaInput.value) || state.fecha || todayIso();

    const payload = {
      fecha_contratacion: fecha,
    };
    CHECKS.forEach((ch) => {
      payload[ch.key] = state.checks[ch.key] === true;
    });
    if (finalizar && CHECKS.every((ch) => state.checks[ch.key] === true)) {
      payload.fase_actual = "contratado";
    }

    try {
      await window.MB_CANDIDATES.patchCandidate(state.candidatoId, payload);
      closeContratacionModal();
      if (typeof window.reloadCurrentRoleData === "function") {
        await window.reloadCurrentRoleData();
      } else if (typeof window.renderContratacionPanelFromState === "function") {
        window.renderContratacionPanelFromState();
      }
    } catch (err) {
      alert(err.message || "No se pudo guardar la contratación.");
    }
  }

  function syncCandidates(candidates) {
    window.__MB_CONTRATACION_CANDIDATES__ = candidates || [];
  }

  bindContratacionActions();

  window.MB_CONTRATACION = {
    renderContratacionPanel,
    openContratacionModal,
    closeContratacionModal,
    setCheck,
    syncCandidates,
    isComplete,
    CHECKS,
  };
})();
