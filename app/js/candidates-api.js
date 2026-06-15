/**
 * Acceso a candidatos_activos vía RPC con sesión (fn_candidatos_list / fn_candidato_update).
 */
(function () {
  const CFG = window.MB_CONFIG || {};
  const SUPA_URL = CFG.SUPABASE_URL || "";
  const SUPA_KEY = CFG.SUPABASE_ANON_KEY || "";

  function sessionToken() {
    return localStorage.getItem("mb_token") || "";
  }

  async function rpc(name, body) {
    const token = sessionToken();
    if (!token) throw new Error("Sesión no iniciada");

    const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_token: token, ...body }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || err.error || `RPC ${name} → ${r.status}`);
    }
    return r.json();
  }

  async function listCandidates(options) {
    const incluirMedico = !!(options && options.medical);
    return rpc("fn_candidatos_list", { p_incluir_medico: incluirMedico });
  }

  async function patchCandidate(id, payload) {
    const result = await rpc("fn_candidato_update", {
      p_id: id,
      p_payload: payload,
    });
    if (result && result.ok === false) {
      throw new Error(result.error || "No se pudo actualizar el candidato");
    }
    return result;
  }

  async function listRejected() {
    return rpc("fn_prospectos_rechazados_list", {});
  }

  async function listSystemLogs(limit) {
    return rpc("fn_sistema_logs_list", { p_limit: limit || 50 });
  }

  window.MB_CANDIDATES = {
    listCandidates,
    listRejected,
    listSystemLogs,
    patchCandidate,
    sessionToken,
  };
})();
