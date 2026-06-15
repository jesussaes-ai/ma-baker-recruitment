/**
 * Extracción de texto de descripciones de puesto (PDF, Microsoft Office, Google/OpenDocument, texto).
 */
(function () {
  const MAX_BYTES = 20 * 1024 * 1024;

  const ACCEPT_EXTENSIONS = [
    "pdf",
    "doc", "docx", "dotx",
    "xls", "xlsx", "xlsm", "csv",
    "ppt", "pptx",
    "odt", "ods", "odp", "rtf",
    "txt", "html", "htm",
    "gdoc", "gsheet", "gslides",
  ];

  const ACCEPT_ATTR = ACCEPT_EXTENSIONS.map((e) => "." + e).join(",");

  const FORMAT_LABELS = {
    pdf: "PDF",
    doc: "Word",
    docx: "Word",
    dotx: "Word",
    xls: "Excel",
    xlsx: "Excel",
    xlsm: "Excel",
    csv: "CSV",
    ppt: "PowerPoint",
    pptx: "PowerPoint",
    odt: "OpenDocument",
    ods: "Hoja de cálculo",
    odp: "Presentación",
    rtf: "RTF",
    txt: "Texto",
    html: "HTML",
    htm: "HTML",
    gdoc: "Google Docs",
    gsheet: "Google Sheets",
    gslides: "Google Slides",
  };

  function extension(file) {
    const name = file?.name || "";
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
  }

  function formatLabel(file) {
    return FORMAT_LABELS[extension(file)] || "Documento";
  }

  function stripFileName(name) {
    return String(name || "")
      .replace(/\.[^.]+$/i, "")
      .replace(/_/g, " ");
  }

  function readArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsArrayBuffer(file);
    });
  }

  function readPlainText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsText(file);
    });
  }

  function loadScript(src, globalName) {
    if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-mb-doc="${globalName || src}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(globalName ? window[globalName] : true));
        existing.addEventListener("error", reject);
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.dataset.mbDoc = globalName || src;
      s.onload = () => resolve(globalName ? window[globalName] : true);
      s.onerror = () => reject(new Error(`No se pudo cargar ${globalName || src}`));
      document.head.appendChild(s);
    });
  }

  async function loadMammoth() {
    return loadScript(
      "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js",
      "mammoth"
    );
  }

  async function loadXlsx() {
    return loadScript("https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js", "XLSX");
  }

  async function loadJsZip() {
    return loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js", "JSZip");
  }

  async function extractPdfText(arrayBuffer) {
    if (!window.pdfjsLib) throw new Error("PDF.js no cargado");
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
    }
    return fullText;
  }

  async function extractDocxText(arrayBuffer) {
    const mammoth = await loadMammoth();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  }

  async function extractXlsxText(arrayBuffer) {
    const XLSX = await loadXlsx();
    const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const parts = [];
    wb.SheetNames.forEach((name) => {
      const sheet = wb.Sheets[name];
      if (!sheet) return;
      parts.push(XLSX.utils.sheet_to_csv(sheet));
    });
    return parts.join("\n");
  }

  async function extractOoxmlZipText(arrayBuffer, xmlPathFilter, tagRegex) {
    const JSZip = await loadJsZip();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const paths = Object.keys(zip.files).filter(xmlPathFilter).sort();
    if (!paths.length) throw new Error("No se encontró contenido legible en el archivo");
    const parts = [];
    for (const p of paths) {
      const xml = await zip.file(p).async("string");
      const texts = [...xml.matchAll(tagRegex)].map((m) => m[1]);
      parts.push(texts.join(" "));
    }
    return parts.join("\n");
  }

  async function extractOdtText(arrayBuffer) {
    const JSZip = await loadJsZip();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const content = await zip.file("content.xml")?.async("string");
    if (!content) throw new Error("OpenDocument inválido");
    return content
      .replace(/<text:line-break\/>/g, "\n")
      .replace(/<text:s[^/]*\/>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body?.textContent || "";
  }

  function stripRtf(rtf) {
    return rtf
      .replace(/\\par[d]?/gi, "\n")
      .replace(/\\tab/gi, "\t")
      .replace(/\\'[0-9a-f]{2}/gi, " ")
      .replace(/\\[a-z]+\d* ?/gi, "")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function readGoogleShortcut(file) {
    const text = await readPlainText(file);
    let meta;
    try {
      meta = JSON.parse(text);
    } catch {
      throw new Error(
        "Archivo de acceso de Google Drive. En Google Docs/Sheets use Archivo → Descargar como Word (.docx) o PDF y suba ese archivo."
      );
    }
    if (meta?.url && /docs\.google\.com/i.test(meta.url)) {
      throw new Error(
        "Enlace directo de Google Docs/Sheets. Descargue el documento como .docx, .xlsx o .pdf desde Google y vuelva a subirlo."
      );
    }
    throw new Error("Formato de Google no soportado. Exporte como Word, Excel o PDF.");
  }

  async function extractText(file) {
    if (!file) throw new Error("Archivo no válido");
    if (file.size > MAX_BYTES) {
      throw new Error("El archivo supera el límite de 20 MB");
    }

    const ext = extension(file);
    if (!ACCEPT_EXTENSIONS.includes(ext)) {
      throw new Error(
        `Formato .${ext || "?"} no soportado. Use PDF, Word, Excel, PowerPoint, OpenDocument o exporte desde Google Docs.`
      );
    }

    if (["gdoc", "gsheet", "gslides"].includes(ext)) {
      return readGoogleShortcut(file);
    }

    if (ext === "txt" || ext === "csv") {
      return readPlainText(file);
    }

    if (ext === "html" || ext === "htm") {
      const html = await readPlainText(file);
      return stripHtml(html);
    }

    if (ext === "rtf") {
      return stripRtf(await readPlainText(file));
    }

    const buffer = await readArrayBuffer(file);

    if (ext === "pdf") return extractPdfText(buffer);
    if (ext === "docx" || ext === "dotx") return extractDocxText(buffer);
    if (ext === "doc") {
      try {
        return await extractDocxText(buffer);
      } catch {
        throw new Error(
          "Word .doc antiguo no soportado. Guarde como .docx en Microsoft Word o exporte desde Google Docs."
        );
      }
    }
    if (ext === "xls" || ext === "xlsx" || ext === "xlsm") return extractXlsxText(buffer);
    if (ext === "pptx") {
      return extractOoxmlZipText(
        buffer,
        (p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p),
        /<a:t[^>]*>([^<]*)<\/a:t>/g
      );
    }
    if (ext === "ppt") {
      throw new Error(
        "PowerPoint .ppt antiguo no soportado. Guarde como .pptx o exporte a PDF."
      );
    }
    if (ext === "odt" || ext === "ods" || ext === "odp") return extractOdtText(buffer);

    throw new Error("Formato no reconocido");
  }

  window.MB_VACANTE_DOCS = {
    ACCEPT_ATTR,
    ACCEPT_EXTENSIONS,
    extractText,
    formatLabel,
    stripFileName,
    MAX_BYTES,
  };
})();
