/**
 * Ma Baker — Módulo de Validaciones y Sanitización
 * ================================================
 * Funciones puras, sin dependencias. Importable desde cualquier HTML del sistema.
 *
 * Uso:
 *   <script src="ma-baker-validators.js"></script>
 *   const r = MaBakerValidators.validateCandidate({nombre, edad, ...});
 *   if (!r.ok) console.log(r.errors);
 */
(function (global) {
  'use strict';

  // ─── Sanitización ─────────────────────────────────────────
  // Elimina caracteres peligrosos de strings (HTML/SQL injection básica)
  function sanitizeText(input, maxLen) {
    if (input == null) return '';
    let s = String(input).trim();
    // Quitar caracteres que pueden romper HTML o SQL
    s = s.replace(/[<>"'`\\]/g, '');
    // Colapsar espacios múltiples
    s = s.replace(/\s+/g, ' ');
    if (maxLen && s.length > maxLen) s = s.slice(0, maxLen);
    return s;
  }

  // Capitaliza nombres ("juan PÉREZ" → "Juan Pérez")
  function capitalizeName(input) {
    return sanitizeText(input, 100)
      .toLowerCase()
      .split(' ')
      .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : '')
      .join(' ');
  }

  // Normaliza string para usar en path de archivo (sin acentos, sin espacios)
  function slugifyForPath(input) {
    return String(input || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase()
      .slice(0, 80);
  }

  // ─── Validadores individuales ─────────────────────────────
  function validateNombre(value) {
    const s = sanitizeText(value);
    if (!s) return 'Nombre es requerido';
    if (s.length < 3) return 'Nombre demasiado corto (mín. 3 caracteres)';
    if (s.length > 100) return 'Nombre demasiado largo (máx. 100 caracteres)';
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.-]+$/.test(s)) return 'Nombre tiene caracteres inválidos';
    if (s.split(' ').filter(w => w.length > 0).length < 2) return 'Ingresa nombre y apellido';
    return null;
  }

  function validateEdad(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'Edad debe ser un número';
    if (!Number.isInteger(n)) return 'Edad debe ser un número entero';
    if (n < 18) return 'Debes ser mayor de edad (18+)';
    if (n > 65) return 'Edad fuera de rango (18-65)';
    return null;
  }

  function validateEstatura(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'Estatura debe ser un número';
    if (n < 1.4) return 'Estatura mínima 1.40m';
    if (n > 2.2) return 'Estatura máxima 2.20m';
    return null;
  }

  function validatePeso(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'Peso debe ser un número';
    if (n < 40) return 'Peso mínimo 40kg';
    if (n > 200) return 'Peso máximo 200kg';
    return null;
  }

  function validateGenero(value) {
    const validos = ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir'];
    if (!value) return 'Género es requerido';
    if (!validos.includes(value)) return 'Género inválido';
    return null;
  }

  function validatePuesto(value) {
    const validos = ['almacen', 'cocinero', 'mesero', 'cajero'];
    if (!value) return 'Puesto es requerido';
    if (!validos.includes(value)) return 'Puesto no reconocido';
    return null;
  }

  // ─── Validador de archivos ────────────────────────────────
  const FILE_LIMITS = {
    maxSize: 10 * 1024 * 1024, // 10 MB
    images: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    pdf: ['application/pdf'],
    all: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
  };

  function validateFile(file, kind /* 'image' | 'pdf' | 'any' */) {
    if (!file) return 'Archivo es requerido';
    if (!(file instanceof File || file instanceof Blob)) return 'Archivo inválido';
    if (file.size === 0) return 'Archivo está vacío';
    if (file.size > FILE_LIMITS.maxSize) {
      return `Archivo muy grande (${(file.size/1024/1024).toFixed(1)}MB). Máximo 10MB`;
    }
    const allowed = kind === 'image' ? FILE_LIMITS.images
                  : kind === 'pdf'   ? FILE_LIMITS.pdf
                  : FILE_LIMITS.all;
    if (file.type && !allowed.includes(file.type.toLowerCase())) {
      return `Tipo de archivo no permitido (${file.type}). Solo: ${allowed.join(', ')}`;
    }
    return null;
  }

  // ─── Validador del candidato completo ─────────────────────
  function validateCandidate(c) {
    const errors = {};
    const e1 = validateNombre(c.nombre); if (e1) errors.nombre = e1;
    const e2 = validateEdad(c.edad); if (e2) errors.edad = e2;
    const e3 = validateEstatura(c.estatura); if (e3) errors.estatura = e3;
    const e4 = validatePeso(c.peso); if (e4) errors.peso = e4;
    const e5 = validateGenero(c.genero); if (e5) errors.genero = e5;
    const e6 = validatePuesto(c.puesto_aplicado); if (e6) errors.puesto_aplicado = e6;
    return {
      ok: Object.keys(errors).length === 0,
      errors,
      cleaned: {
        nombre: capitalizeName(c.nombre),
        edad: parseInt(c.edad, 10),
        estatura: parseFloat(c.estatura),
        peso: parseFloat(c.peso),
        genero: c.genero,
        puesto_aplicado: c.puesto_aplicado
      }
    };
  }

  // ─── Constructor de path único para storage ───────────────
  function buildStoragePath(candidateName, fileType, extension) {
    const ts = Date.now();
    const slug = slugifyForPath(candidateName) || 'anonimo';
    const ext = extension || 'bin';
    return `${slug}_${ts}.${ext}`;
  }

  // ─── Export ───────────────────────────────────────────────
  global.MaBakerValidators = {
    sanitizeText,
    capitalizeName,
    slugifyForPath,
    validateNombre,
    validateEdad,
    validateEstatura,
    validatePeso,
    validateGenero,
    validatePuesto,
    validateFile,
    validateCandidate,
    buildStoragePath,
    FILE_LIMITS
  };
})(window);
