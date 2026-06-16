/**
 * Configuración de campos opcionales visibles en el portal de postulación.
 * El descriptivo interno (descripcion_completa) permanece siempre en RRHH.
 */
(function () {
  const DEFAULTS = {
    nombre: true,
    departamento: true,
    descripcion: true,
    escolaridad: true,
    experiencia: true,
    edad: true,
    sueldo: false,
    conocimientos: false,
    competencias: false,
  };

  const LABELS = {
    nombre: "Nombre del puesto",
    departamento: "Departamento / área",
    descripcion: "Descripción / resumen para candidatos",
    escolaridad: "Escolaridad mínima",
    experiencia: "Experiencia requerida",
    edad: "Rango de edad",
    sueldo: "Rango salarial",
    conocimientos: "Conocimientos técnicos",
    competencias: "Competencias clave",
  };

  function normalize(raw) {
    const out = { ...DEFAULTS };
    if (!raw || typeof raw !== "object") return out;
    Object.keys(DEFAULTS).forEach((k) => {
      if (typeof raw[k] === "boolean") out[k] = raw[k];
    });
    out.nombre = true;
    out.departamento = true;
    return out;
  }

  function readFromDom(prefix) {
    const cfg = { ...DEFAULTS };
    Object.keys(DEFAULTS).forEach((k) => {
      const el = document.getElementById(`${prefix}${k}`);
      if (!el) return;
      cfg[k] = !!el.checked;
    });
    cfg.nombre = true;
    cfg.departamento = true;
    return cfg;
  }

  function applyToDom(prefix, raw) {
    const cfg = normalize(raw);
    Object.keys(DEFAULTS).forEach((k) => {
      const el = document.getElementById(`${prefix}${k}`);
      if (el) el.checked = !!cfg[k];
    });
  }

  function isVisible(raw, key) {
    return normalize(raw)[key] === true;
  }

  window.MB_PORTAL_VACANTE = {
    DEFAULTS,
    LABELS,
    normalize,
    readFromDom,
    applyToDom,
    isVisible,
  };
})();
