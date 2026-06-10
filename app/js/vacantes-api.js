/**
 * CRUD de catalogo_puestos vía RPC con sesión (admin/rrhh).
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
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || data.error || `RPC ${name} → ${r.status}`);
    if (data && data.ok === false) throw new Error(data.error || "Operación rechazada");
    return data;
  }

  async function updateVacante(id, payload) {
    return rpc("fn_catalogo_puesto_update", { p_id: id, p_payload: payload });
  }

  async function insertVacante(payload) {
    return rpc("fn_catalogo_puesto_insert", { p_payload: payload });
  }

  window.MB_VACANTES = { updateVacante, insertVacante };
})();
