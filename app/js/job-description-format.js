/**
 * Formatea texto plano de descripciones de puesto (PDF/Word) en HTML legible.
 * Regla uniforme: «Etiqueta: valor» en una sola línea en todas las secciones.
 */
(function () {
  const INLINE_LABELS = [
    "Descripción de puesto",
    "Nombre del puesto",
    "Departamento o área",
    "Departamento",
    "Área",
    "Empresa",
    "Ubicación",
    "Reporta a",
    "Objetivo del puesto",
    "Objetivo general",
    "Funciones principales",
    "Funciones",
    "Responsabilidades",
    "Actividades",
    "Requisitos",
    "Escolaridad",
    "Experiencia",
    "Experiencia mínima",
    "Experiencia deseable",
    "Conocimientos",
    "Competencias",
    "Horario",
    "Jornada",
    "Sueldo",
    "Salario",
    "Remuneración",
    "Edad",
    "Beneficios",
    "Puesto del jefe directo",
    "Jefe directo",
    "Jefe inmediato",
    "Puestos que supervisa",
    "Personal que supervisa",
    "Personal a cargo",
    "Subordinados",
    "Tipo de jornada",
    "Modalidad de trabajo",
    "Modalidad",
    "Fecha de elaboración",
    "Fecha de revisión",
    "Fecha de autorización",
    "Turno",
    "Días laborables",
    "Vigencia",
    "Elaboró",
    "Revisó",
    "Autorizó",
    "Carrera/Especialidad",
    "Carrera",
    "Especialidad",
    "Sector",
    "Certificaciones",
    "Certificación",
    "Idiomas",
    "Sexo",
    "Género",
    "Disponibilidad",
  ];

  const LABEL_PATTERNS = [
    /^nombre del puesto$/i,
    /^departamento(\s+o\s+área)?$/i,
    /^empresa$/i,
    /^ubicaci[oó]n$/i,
    /^puesto del jefe directo$/i,
    /^jefe (directo|inmediato)$/i,
    /^reporta a$/i,
    /^puestos? que supervisa$/i,
    /^personal (que supervisa|a cargo)$/i,
    /^subordinados?$/i,
    /^tipo de jornada$/i,
    /^modalidad( de trabajo)?$/i,
    /^objetivo (del puesto|general)?$/i,
    /^escolaridad$/i,
    /^experiencia(\s+(m[ií]nima|deseable|requerida))?$/i,
    /^carrera(\s*\/?\s*especialidad)?$/i,
    /^sector$/i,
    /^certificaci[oó]n(es)?$/i,
    /^horario$/i,
    /^turno$/i,
    /^jornada$/i,
    /^fecha de (elaboraci[oó]n|revisi[oó]n|autorizaci[oó]n)$/i,
    /^d[ií]as laborables$/i,
    /^vigencia$/i,
    /^(elabor[oó]|revis[oó]|autoriz[oó])$/i,
    /^idiomas?$/i,
    /^disponibilidad$/i,
  ];

  const LABEL_PREFIX_PATTERNS = [
    /^puestos?\s/i,
    /^tipo\s+de\s+/i,
    /^modalidad\s+de\s+/i,
    /^horario/i,
    /^turno/i,
    /^fecha\s+de\s+/i,
    /^personal\s/i,
    /^puesto\s+del\s+jefe/i,
    /^reporta\s+a/i,
    /^subordin/i,
    /^supervis/i,
    /que\s+supervis/i,
    /^jornada/i,
    /^d[ií]as\s/i,
    /^nivel\s+de\s+/i,
    /^grado\s+de\s+/i,
    /^rango\s+de\s+/i,
    /^antigüedad/i,
    /^vigencia/i,
    /^(elabor|revis|autoriz)/i,
    /^experiencia\s/i,
    /^carrera\s/i,
    /^certificaci/i,
    /^requisitos?\s/i,
    /^conocimientos?\s/i,
    /^competencias?\s/i,
  ];

  /** Palabras clave típicas de etiquetas en descriptivos corporativos. */
  const LABEL_HINT_RE =
    /\b(m[ií]nima|m[aá]xima|deseable|requerid|necesari|obligatori|especialidad|certificaci[oó]n|sector|carrera|idioma|sexo|g[eé]nero|escolaridad|experiencia|disponibilidad|licencia|antigüedad|sueldo|salario|horario|turno|jornada|modalidad|ubicaci[oó]n|empresa|departamento|[áa]rea)\b/i;

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const SMALL_WORDS = new Set([
    "de", "del", "la", "las", "el", "los", "en", "y", "a", "o", "u", "por", "para", "con", "sin", "al", "e",
  ]);

  const DENSE_SECTION_MARKERS = [
    "DESCRIPCIÓN DE PUESTO",
    "IDENTIFICACIÓN DEL PUESTO",
    "IDENTIFICACIÓN",
    "FUNCIONES PRINCIPALES",
    "FUNCIONES",
    "RESPONSABILIDADES",
    "ACTIVIDADES",
    "REQUISITOS DEL PUESTO",
    "REQUISITOS",
    "PERFIL DEL PUESTO",
    "PERFIL",
    "OBJETIVO DEL PUESTO",
    "OBJETIVO",
    "CONDICIONES DE TRABAJO",
    "BENEFICIOS",
  ];

  function letterStats(text) {
    const letters = String(text || "").replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
    if (!letters.length) return { letters: "", capsRatio: 0 };
    const caps = letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length;
    return { letters, capsRatio: caps / letters.length };
  }

  function isMostlyUppercase(text) {
    const { letters, capsRatio } = letterStats(text);
    return letters.length >= 8 && capsRatio >= 0.72;
  }

  /** Convierte bloques MAYÚSCULAS a título o oración legible (no altera texto mixto normal). */
  function toReadableCase(text, kind) {
    const t = String(text || "").trim();
    if (!t) return t;
    const mostlyCaps = isMostlyUppercase(t);
    if (!mostlyCaps && kind !== "header") return t;

    if (kind === "header" || (kind === "auto" && t.length <= 80 && mostlyCaps)) {
      return t
        .toLowerCase()
        .split(/\s+/)
        .map((word, index) => {
          if (index > 0 && SMALL_WORDS.has(word)) return word;
          if (/^[a-z]{1,3}$/i.test(word) && word === word.toUpperCase()) return word;
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
    }

    const lower = t.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  function splitIntoSentences(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ0-9("])/u)
      .map((s) => s.trim())
      .filter((s) => s.length > 8);
  }

  /** Separa «TÍTULO EN MAYÚSCULAS cuerpo en minúsculas…» en dos líneas. */
  function splitCapsHeaderFromBody(line) {
    const t = String(line || "").trim();
    if (!t || t.includes(":")) return null;
    const m = t.match(/^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\-/]{8,82})\s+(.+)$/u);
    if (!m) return null;
    const header = m[1].trim();
    const body = m[2].trim();
    if (!isMostlyUppercase(header)) return null;
    if (header.split(/\s+/).length < 2) return null;
    if (isMostlyUppercase(body)) return null;
    if (!/[a-záéíóúñ]/.test(body)) return null;
    if (isKnownLabelLine(header)) return null;
    return { header, body };
  }

  /** Inserta saltos en textos PDF/Word pegados en una sola línea. */
  function expandDenseBlocks(text) {
    let t = normalizeRawText(text);
    const newlineCount = (t.match(/\n/g) || []).length;
    if (newlineCount >= 6 && t.length < 1800) return t;

    for (const marker of [...DENSE_SECTION_MARKERS].sort((a, b) => b.length - a.length)) {
      const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      t = t.replace(new RegExp(`(?<!^)\\s+(?=${escaped}(?:\\s|[:–-]|$))`, "gi"), "\n\n");
    }

    t = t.replace(/(\s|^)(\d+\.\s+)/g, "\n$2");
    t = t.replace(/(\s|^)([-•*]\s+)/g, "\n$2");

    const chunks = t.split(/(?<=[.!?])\s+/);
    const parts = [];
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      const hb = splitCapsHeaderFromBody(trimmed);
      if (hb) {
        parts.push(hb.header, hb.body);
      } else {
        parts.push(trimmed);
      }
    }
    return parts.join("\n\n");
  }

  function preprocessStructuredText(text) {
    const expanded = expandDenseBlocks(normalizeRawText(text));
    const lines = expanded.split("\n");
    const out = [];
    for (const raw of lines) {
      const line = String(raw || "").trim();
      if (!line) {
        out.push("");
        continue;
      }
      const split = splitCapsHeaderFromBody(line);
      if (split) {
        out.push(split.header);
        out.push(split.body);
        continue;
      }
      out.push(line);
    }
    return normalizeRawText(out.join("\n"));
  }

  function normalizeRawText(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function expandInlineFields(text) {
    let out = text;
    const sorted = [...INLINE_LABELS].sort((a, b) => b.length - a.length);
    for (const label of sorted) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`([.;!?]|^)\\s*(${escaped})\\s*:\\s*`, "gi");
      out = out.replace(re, (_, punct, lbl) => `${punct || ""}\n${lbl}: `);
    }
    return normalizeRawText(out);
  }

  function parseFieldLine(line) {
    const m = String(line || "").match(/^([^:]{2,90})\s*:\s*(.*)$/);
    if (!m) return null;
    const label = m[1].trim();
    const value = m[2].trim();
    if (!value || label.length < 2) return null;
    if (/^https?$/i.test(label)) return null;
    if (value.length <= 24 && isMostlyUppercase(value)) return null;
    if (label.length > 52 && !isKnownLabelLine(label)) return null;
    if (!isFieldLabelLine(label) && !isKnownLabelLine(label)) return null;
    if (value.length > 110) return null;
    return { label, value };
  }

  function isSubsectionHeader(line) {
    const t = normalizeLabelText(line);
    if (!t) return false;
    if (isKnownLabelLine(t)) return false;
    if (/^(ACTIVIDADES|FUNCIONES|RESPONSABILIDADES|OBJETIVOS?|INDICADORES|ALCANCE|PERFIL|DESCRIPCI[ÓO]N|MEDIDAS|POL[IÍ]TICAS)\b/i.test(t)) {
      return true;
    }
    const words = t.split(/\s+/);
    if (words.length <= 8 && t.length <= 85 && isMostlyUppercase(t)) {
      return true;
    }
    if (words.length <= 5 && t.length <= 58) {
      const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
      if (letters.length >= 10) {
        const caps = letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length;
        if (caps / letters.length >= 0.82) return true;
      }
    }
    return false;
  }

  function isSectionHeader(line) {
    const t = String(line || "").trim();
    if (!t || t.length < 4) return false;
    if (parseFieldLine(t) && !/^\d+\.\s/.test(t)) return false;
    if (/^\d+\.\s+[A-ZÁÉÍÓÚÑ0-9(\[]/.test(t)) return true;
    if (/^\[.+\]$/.test(t)) return true;
    if (
      /^(DESCRIPCIÓN DE PUESTO|DESCRIPCIÓN|IDENTIFICACIÓN DEL PUESTO|IDENTIFICACIÓN|REQUISITOS DEL PUESTO|REQUISITOS|PERFIL DEL PUESTO|PERFIL|BENEFICIOS|CONDICIONES DE TRABAJO|CONDICIONES|FUNCIONES PRINCIPALES|FUNCIONES|RESPONSABILIDADES|ACTIVIDADES)(\s|–|-|$)/i.test(
        t
      ) &&
      !/:\s*\S/.test(t)
    ) {
      return true;
    }
    return false;
  }

  function normalizeLabelText(text) {
    return String(text || "")
      .trim()
      .replace(/:$/, "")
      .replace(/\s+/g, " ");
  }

  function looksLikeStandaloneValue(text) {
    const t = normalizeLabelText(text);
    if (!t) return false;
    if (/^no aplica$/i.test(t)) return true;
    if (/^(tiempo completo|medio tiempo|presencial|remoto|h[ií]brido|mixto)$/i.test(t)) return true;
    if (/^\d+\s*(año|años|mes|meses|d[ií]a|d[ií]as)\b/i.test(t)) return true;
    if (/^\$[\d,]/.test(t)) return true;
    if (/^\d+([.,]\d+)?\s*%/.test(t)) return true;
    return false;
  }

  function isKnownLabelLine(line) {
    const t = normalizeLabelText(line);
    if (!t) return false;
    if (INLINE_LABELS.some((l) => t.toLowerCase() === l.toLowerCase())) return true;
    return LABEL_PATTERNS.some((re) => re.test(t));
  }

  /** Etiqueta genérica de formulario (cualquier sección del descriptivo). */
  function isGenericFormLabel(line) {
    const t = normalizeLabelText(line);
    if (!t || t.length < 2 || t.length > 85) return false;
    if (isSectionHeader(t) || isSubsectionHeader(t)) return false;
    if (/^\d+\.\s/.test(t)) return false;
    if (/:\s*\S/.test(t)) return false;
    if (looksLikeStandaloneValue(t)) return false;
    if (/[.!?;]$/.test(t) && t.length > 35) return false;

    if (LABEL_HINT_RE.test(t)) return true;
    if (/\//.test(t) && !/\s+\/\s+/.test(t) && t.length <= 50) return true;

    const words = t.split(/\s+/);
    if (words.length > 8) return false;

    if (words.length <= 4 && t.length <= 45 && !/\d{2,}/.test(t)) {
      const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
      if (letters.length >= 3) {
        const caps = letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length;
        if (caps / letters.length >= 0.9 && words.length >= 4) return false;
        return true;
      }
    }
    return false;
  }

  function isFieldLabelLine(line) {
    const t = normalizeLabelText(line);
    if (!t) return false;
    if (isKnownLabelLine(t)) return true;
    if (isSectionHeader(t)) return false;
    if (LABEL_PREFIX_PATTERNS.some((re) => re.test(t))) return true;
    if (isSubsectionHeader(t)) return false;
    return isGenericFormLabel(t);
  }

  function isLikelyFieldValue(labelLine, valueLine) {
    const value = String(valueLine || "").trim();
    if (!value) return false;
    if (/[.!?]$/.test(String(labelLine || "").trim()) && String(labelLine || "").trim().length > 28) return false;
    if (value.length > 110) return false;
    if (isSectionHeader(value) || isSubsectionHeader(value)) return false;
    if (parseFieldLine(value)) return false;
    if (isKnownLabelLine(value)) return false;

    const label = normalizeLabelText(labelLine);
    if (value.toLowerCase() === label.toLowerCase()) return false;

    if (isFieldLabelLine(value) && !looksLikeStandaloneValue(value)) {
      if (isKnownLabelLine(value) || LABEL_HINT_RE.test(value)) return false;
    }
    return true;
  }

  function nextNonEmptyLine(lines, fromIndex) {
    for (let j = fromIndex + 1; j < lines.length; j += 1) {
      const text = String(lines[j] || "").trim();
      if (text) return { text, index: j };
    }
    return null;
  }

  function tryPairField(labelLine, lines, lineIndex) {
    const label = normalizeLabelText(labelLine);
    if (!isFieldLabelLine(label)) return null;
    const next = nextNonEmptyLine(lines, lineIndex);
    if (!next || !isLikelyFieldValue(label, next.text)) return null;
    return { label, value: next.text, skipTo: next.index };
  }

  /** Une «Etiqueta» + línea(s) vacía(s) + «Valor» → «Etiqueta: Valor». */
  function collapseLabelValuePairs(text) {
    const lines = text.split("\n");
    const result = [];
    let i = 0;
    while (i < lines.length) {
      const trimmed = String(lines[i] || "").trim();
      if (!trimmed) {
        result.push("");
        i += 1;
        continue;
      }
      const paired = tryPairField(trimmed, lines, i);
      if (paired) {
        result.push(`${paired.label}: ${paired.value}`);
        i = paired.skipTo + 1;
        continue;
      }
      result.push(lines[i]);
      i += 1;
    }
    return normalizeRawText(result.join("\n"));
  }

  function renderFieldRow(field) {
    const label = toReadableCase(field.label, "header");
    const value = toReadableCase(field.value, "body");
    return (
      `<div class="mb-job-field">` +
      `<span class="mb-job-field-label">${escHtml(label)}</span>` +
      `<span class="mb-job-field-sep" aria-hidden="true">:</span> ` +
      `<span class="mb-job-field-value">${escHtml(value)}</span>` +
      `</div>`
    );
  }

  function renderReadableBlock(text) {
    const readable = toReadableCase(text, "body");
    const sentences = splitIntoSentences(readable);
    if (sentences.length >= 1 && readable.length > 24) {
      return sentences
        .map((s) => `<div class="mb-job-bullet">${escHtml(s)}</div>`)
        .join("");
    }
    return `<p class="mb-job-paragraph">${escHtml(readable)}</p>`;
  }

  function formatJobDescriptionHtml(rawText) {
    const normalized = collapseLabelValuePairs(
      expandInlineFields(preprocessStructuredText(rawText))
    );
    if (!normalized) {
      return '<p class="mb-job-empty">Sin descripción disponible.</p>';
    }

    const lines = normalized.split("\n");
    const parts = [];
    let currentSection = null;
    let paragraphBuffer = [];

    function flushParagraph() {
      if (!paragraphBuffer.length) return;
      const p = paragraphBuffer.join(" ").replace(/\s+/g, " ").trim();
      paragraphBuffer = [];
      if (!p) return;
      if (currentSection === null) openSection("Detalle del puesto");
      parts.push(renderReadableBlock(p));
    }

    function closeSection() {
      flushParagraph();
      if (currentSection !== null) {
        parts.push("</div></section>");
        currentSection = null;
      }
    }

    function openSection(title) {
      closeSection();
      currentSection = title;
      parts.push(
        `<section class="mb-job-section">` +
          `<h5 class="mb-job-section-title">${escHtml(toReadableCase(title, "header"))}</h5>` +
          `<div class="mb-job-section-body">`
      );
    }

    let fieldCount = 0;
    let headerCount = 0;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) {
        flushParagraph();
        continue;
      }

      if (isSectionHeader(line)) {
        headerCount += 1;
        openSection(line);
        continue;
      }

      const inlineField = parseFieldLine(line);
      if (inlineField) {
        fieldCount += 1;
        flushParagraph();
        if (currentSection === null) openSection("Información general");
        parts.push(renderFieldRow(inlineField));
        continue;
      }

      const split = tryPairField(line, lines, i);
      if (split) {
        fieldCount += 1;
        flushParagraph();
        if (currentSection === null) openSection("Información general");
        parts.push(renderFieldRow(split));
        i = split.skipTo;
        continue;
      }

      if (isSubsectionHeader(line)) {
        flushParagraph();
        headerCount += 1;
        if (currentSection === null) openSection("Funciones y responsabilidades");
        parts.push(
          `<h6 class="mb-job-subsection-title">${escHtml(toReadableCase(normalizeLabelText(line), "header"))}</h6>`
        );
        continue;
      }

      if (paragraphBuffer.length === 1) {
        const pending = paragraphBuffer[0];
        const pair = tryPairField(pending, [pending, line], 0);
        if (pair) {
          paragraphBuffer = [];
          fieldCount += 1;
          if (currentSection === null) openSection("Información general");
          parts.push(renderFieldRow(pair));
          continue;
        }
      }

      if (/^[-•*]\s+/.test(line)) {
        flushParagraph();
        if (currentSection === null) openSection("Detalle del puesto");
        parts.push(
          `<div class="mb-job-bullet">${escHtml(toReadableCase(line.replace(/^[-•*]\s+/, ""), "body"))}</div>`
        );
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        flushParagraph();
        if (currentSection === null) openSection("Detalle del puesto");
        parts.push(
          `<div class="mb-job-bullet mb-job-bullet--numbered">${escHtml(toReadableCase(line.replace(/^\d+\.\s+/, ""), "body"))}</div>`
        );
        continue;
      }

      paragraphBuffer.push(line);
    }

    closeSection();

    if (parts.length === 0 && fieldCount === 0 && headerCount === 0) {
      const sentences = splitIntoSentences(toReadableCase(normalized, "body"));
      if (sentences.length >= 2) {
        const bullets = sentences
          .map((s) => `<div class="mb-job-bullet">${escHtml(s)}</div>`)
          .join("");
        return (
          `<div class="mb-job-doc">` +
          `<section class="mb-job-section">` +
          `<h5 class="mb-job-section-title">Funciones y responsabilidades</h5>` +
          `<div class="mb-job-section-body">${bullets}</div>` +
          `</section></div>`
        );
      }
      return (
        `<div class="mb-job-doc mb-job-doc--prose">` +
        renderReadableBlock(normalized) +
        `</div>`
      );
    }

    return `<div class="mb-job-doc">${parts.join("")}</div>`;
  }

  window.MB_JOB_DESC = {
    formatHtml: formatJobDescriptionHtml,
    normalizeRawText,
    preprocessStructuredText,
    expandInlineFields,
    collapseLabelValuePairs,
    toReadableCase,
    splitIntoSentences,
  };
})();
