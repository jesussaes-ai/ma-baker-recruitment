/**
 * navigation.js — Botones globales Atrás / Inicio
 * Ma Baker and Chef | Sistema de Reclutamiento
 */
(function () {
  const PUBLIC_HOME = "index.html";

  const ROLE_ROUTES = {
    admin: "dashboard-admin.html",
    rrhh: "dashboard-rrhh.html",
    medico: "dashboard-medico.html",
    jefe: "dashboard-jefe.html",
    sgi: "dashboard-sgi.html",
    seguridad: "dashboard-seguridad.html",
  };

  const MODULE_PARENTS = new Set([
    "cargar-puestos.html",
    "cargar-psicometricos.html",
    "ayuda.html",
  ]);

  const HEADER_SELECTORS = [
    "main > header",
    "main.flex-col > header",
    ".dashboard-main > header",
    "body > .flex > main > header",
    "body > header.sticky",
    "header.topbar",
  ];

  function currentPage() {
    return (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function isEmbedded() {
    return new URLSearchParams(window.location.search).get("embed") === "1";
  }

  function hasSession() {
    return !!localStorage.getItem("mb_token");
  }

  function getDashboardHome() {
    const rol = (localStorage.getItem("mb_rol") || "").toLowerCase();
    return ROLE_ROUTES[rol] || null;
  }

  function getHomeUrl() {
    const dash = getDashboardHome();
    if (hasSession() && dash) return dash;
    return PUBLIC_HOME;
  }

  function getFallbackBackUrl() {
    const page = currentPage();
    const dash = getDashboardHome();

    if (MODULE_PARENTS.has(page) && dash) return dash;
    if (page === "login.html") return PUBLIC_HOME;
    if (page === "evaluacion-candidato.html") return PUBLIC_HOME;
    if (page === "portal-candidato.html") return PUBLIC_HOME;
    if (page === "postulacion-module.html") return PUBLIC_HOME;
    if (page === "ayuda.html") return dash || PUBLIC_HOME;

    const home = getHomeUrl();
    if (page !== home) return home;
    return PUBLIC_HOME;
  }

  function canGoBack() {
    if (window.history.length <= 1) return false;
    const ref = document.referrer || "";
    if (!ref) return true;
    try {
      return new URL(ref).origin === window.location.origin;
    } catch {
      return true;
    }
  }

  function goBack() {
    const page = currentPage();
    const fallback = getFallbackBackUrl();

    if (canGoBack()) {
      window.history.back();
      return;
    }
    if (fallback && fallback !== page) {
      window.location.href = fallback;
      return;
    }
    const home = getHomeUrl();
    if (home !== page) window.location.href = home;
  }

  function goHome() {
    window.location.href = getHomeUrl();
  }

  function syncBrandLogo() {
    const logo = document.getElementById("mb-brand-logo-fixed");
    if (logo) logo.href = getHomeUrl();
  }

  function findHeader() {
    for (const sel of HEADER_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function findHeaderActions(header) {
    const children = Array.from(header.children);
    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = children[i];
      if (!(child instanceof HTMLElement)) continue;
      const cls = child.className || "";
      if (cls.includes("flex") && cls.includes("items-center")) return child;
    }
    return null;
  }

  function injectStyles() {
    if (document.getElementById("mb-nav-styles")) return;
    const style = document.createElement("style");
    style.id = "mb-nav-styles";
    style.textContent = `
      #mb-nav-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: nowrap;
        flex-shrink: 0;
      }
      #mb-nav-bar.mb-nav-bar--inline {
        position: static;
        z-index: 1;
        margin-right: 4px;
      }
      #mb-nav-bar.mb-nav-bar--fixed {
        position: fixed;
        top: auto;
        bottom: 152px;
        left: 14px;
        right: auto;
        z-index: 1201;
        flex-direction: row;
      }
      .mb-nav-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: none;
        border-radius: 999px;
        cursor: pointer;
        font-family: 'Montserrat', sans-serif;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        text-decoration: none;
        box-shadow: 0 2px 10px rgba(0,0,0,0.15);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        user-select: none;
        white-space: nowrap;
      }
      #mb-nav-bar.mb-nav-bar--inline .mb-nav-btn {
        box-shadow: none;
        padding: 7px 11px;
      }
      .mb-nav-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(0,0,0,0.2);
      }
      .mb-nav-btn:active { transform: scale(0.98); }
      .mb-nav-btn .mb-nav-icon { font-size: 13px; line-height: 1; }
      html[data-theme="dark"] .mb-nav-btn--back {
        background: rgba(30, 41, 59, 0.95);
        color: #F8FAFC;
        border: 1px solid rgba(255,255,255,0.12);
      }
      html[data-theme="dark"] .mb-nav-btn--home {
        background: #D7282F;
        color: #FFFFFF;
      }
      html[data-theme="light"] .mb-nav-btn--back {
        background: #FFFFFF;
        color: #1E293B;
        border: 1px solid #E2E8F0;
      }
      html[data-theme="light"] .mb-nav-btn--home {
        background: #D7282F;
        color: #FFFFFF;
      }
      @media (max-width: 900px) {
        #mb-nav-bar.mb-nav-bar--inline .mb-nav-btn span:last-child {
          display: none;
        }
        #mb-nav-bar.mb-nav-bar--inline .mb-nav-btn {
          padding: 8px 10px;
        }
      }
      @media (max-width: 640px) {
        #mb-nav-bar.mb-nav-bar--fixed {
          bottom: 144px;
          left: 12px;
        }
        #mb-nav-bar.mb-nav-bar--fixed .mb-nav-btn {
          font-size: 10px;
          padding: 8px 10px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function mountBar(bar) {
    const header = findHeader();
    if (header) {
      bar.classList.add("mb-nav-bar--inline");
      const actions = findHeaderActions(header);
      if (actions) {
        actions.insertBefore(bar, actions.firstChild);
        return;
      }
      const loneAction = Array.from(header.children).find((ch) => {
        if (!(ch instanceof HTMLElement)) return false;
        if (ch === header.firstElementChild) return false;
        const tag = ch.tagName;
        return tag === "A" || tag === "BUTTON";
      });
      if (loneAction) {
        const slot = document.createElement("div");
        slot.className = "flex items-center gap-3 shrink-0";
        header.replaceChild(slot, loneAction);
        slot.appendChild(bar);
        slot.appendChild(loneAction);
        return;
      }
      const wrap = document.createElement("div");
      wrap.className = "flex items-center gap-2 shrink-0 ml-auto";
      wrap.appendChild(bar);
      header.appendChild(wrap);
      return;
    }
    bar.classList.add("mb-nav-bar--fixed");
    document.body.appendChild(bar);
  }

  function inject() {
    if (document.getElementById("mb-nav-bar") || isEmbedded()) return;

    const page = currentPage();
    const home = getHomeUrl();
    const showHome = page !== home && page !== "";
    const showBack = page !== PUBLIC_HOME || canGoBack();

    if (!showHome && !showBack) return;

    injectStyles();
    syncBrandLogo();

    const bar = document.createElement("div");
    bar.id = "mb-nav-bar";
    bar.setAttribute("role", "navigation");
    bar.setAttribute("aria-label", "Navegación principal");

    if (showBack) {
      const back = document.createElement("button");
      back.type = "button";
      back.className = "mb-nav-btn mb-nav-btn--back";
      back.title = "Regresar a la pantalla anterior";
      back.innerHTML = '<span class="mb-nav-icon" aria-hidden="true">←</span><span>Atrás</span>';
      back.onclick = goBack;
      bar.appendChild(back);
    }

    if (showHome) {
      const homeBtn = document.createElement("button");
      homeBtn.type = "button";
      homeBtn.className = "mb-nav-btn mb-nav-btn--home";
      homeBtn.title = hasSession() ? "Ir a mi panel principal" : "Ir al inicio del portal";
      homeBtn.innerHTML = '<span class="mb-nav-icon" aria-hidden="true">⌂</span><span>Inicio</span>';
      homeBtn.onclick = goHome;
      bar.appendChild(homeBtn);
    }

    mountBar(bar);
  }

  window.MB_NAV = {
    inject,
    goBack,
    goHome,
    getHomeUrl,
    syncBrandLogo,
  };
})();
