/*
 * Menú de aplicaciones de Ganemo (botón de 9 puntos) — implementación de referencia, sin dependencias.
 * Contrato y especificación: README.md de este repo y Blenau company/infra/menu-de-aplicaciones.md.
 *
 * Uso (copiar este archivo y menu.css a la app; NO cargarlos desde github.io: el código que ejecuta tu app vive
 * en tu app):
 *
 *   GanemoMenu.montar({
 *     contenedor: document.querySelector("#barra-derecha"), // dónde va el botón (si falta: flotante abajo-derecha)
 *     correo: "ana@ganemo.co",          // usuario con sesión; sin sesión NO llamar a montar()
 *     appId: "dashboards",              // id de ESTA app en la lista (se resalta y abre en la misma pestaña)
 *     urlLista: "https://ganemo-infra.github.io/menu-aplicaciones/v1/aplicaciones.json", // opcional
 *     respaldo: {...}                   // opcional: copia embebida del JSON por si la URL no responde
 *   });
 *
 * Reglas que cumple: todo con createElement/textContent (nunca innerHTML con datos); solo URLs https; visibilidad
 * 'personal' solo para dominios internos; si quedan menos de 2 apps visibles no pinta nada; caché de 10 min en
 * localStorage; si la URL falla usa la caché vieja y si no hay, el respaldo.
 */
(function (global) {
  "use strict";

  var URL_LISTA = "https://ganemo-infra.github.io/menu-aplicaciones/v1/aplicaciones.json";
  var CLAVE_CACHE = "ganemo-menu-v1";
  var TTL_MS = 10 * 60 * 1000;
  var SVG = "http://www.w3.org/2000/svg";
  var contador = 0;

  function el(etiqueta, clase, texto) {
    var e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }

  function nuevePuntos() {
    var svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    [5, 12, 19].forEach(function (y) {
      [5, 12, 19].forEach(function (x) {
        var c = document.createElementNS(SVG, "circle");
        c.setAttribute("cx", x);
        c.setAttribute("cy", y);
        c.setAttribute("r", "2");
        c.setAttribute("fill", "currentColor");
        svg.appendChild(c);
      });
    });
    return svg;
  }

  function leerCache() {
    try {
      var c = JSON.parse(global.localStorage.getItem(CLAVE_CACHE) || "null");
      return c && c.datos ? c : null;
    } catch (e) {
      return null;
    }
  }

  function guardarCache(datos) {
    try {
      global.localStorage.setItem(CLAVE_CACHE, JSON.stringify({ t: Date.now(), datos: datos }));
    } catch (e) { /* modo privado o almacenamiento bloqueado: no pasa nada */ }
  }

  function valida(datos) {
    return datos && datos.version === 1 && Array.isArray(datos.apps) ? datos : null;
  }

  /** Devuelve una promesa con la lista: caché fresca -> URL (3 s) -> caché vieja -> respaldo. */
  function obtenerLista(urlLista, respaldo) {
    var cache = leerCache();
    if (cache && Date.now() - cache.t < TTL_MS && valida(cache.datos)) return Promise.resolve(cache.datos);
    var ctl = global.AbortController ? new AbortController() : null;
    var reloj = ctl ? setTimeout(function () { ctl.abort(); }, 3000) : null;
    return fetch(urlLista || URL_LISTA, { credentials: "omit", signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        clearTimeout(reloj);
        if (!valida(d)) throw new Error("lista no válida");
        guardarCache(d);
        return d;
      })
      .catch(function () {
        clearTimeout(reloj);
        return (cache && valida(cache.datos)) || valida(respaldo) || null;
      });
  }

  /** Aplica las reglas del contrato: https, visibilidad, orden. */
  function filtrar(datos, correo) {
    var c = String(correo || "").toLowerCase();
    var dominio = c.slice(c.lastIndexOf("@") + 1);
    var interno = c.indexOf("@") > 0 && (datos.dominiosInternos || []).indexOf(dominio) >= 0;
    return datos.apps
      .filter(function (a) {
        return a && a.id && a.nombre && /^https:\/\/[^\s"'<>]+$/.test(a.url) &&
          (a.visibilidad === "todos" || (a.visibilidad === "personal" && interno));
      })
      .sort(function (x, y) { return (x.orden || 0) - (y.orden || 0); });
  }

  function construir(apps, appId) {
    var n = ++contador;
    var cont = el("div", "ganemo-lanzador");
    var boton = el("button", "ganemo-lanzador-boton");
    boton.type = "button";
    boton.title = "Aplicaciones de Ganemo";
    boton.setAttribute("aria-label", "Aplicaciones de Ganemo");
    boton.setAttribute("aria-haspopup", "true");
    boton.setAttribute("aria-expanded", "false");
    boton.setAttribute("aria-controls", "ganemo-lanzador-panel-" + n);
    boton.appendChild(nuevePuntos());

    var panel = el("div", "ganemo-lanzador-panel");
    panel.id = "ganemo-lanzador-panel-" + n;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Tus aplicaciones");
    panel.hidden = true;
    panel.appendChild(el("div", "ganemo-lanzador-titulo", "Tus aplicaciones"));
    var grilla = el("div", "ganemo-lanzador-grilla");
    apps.forEach(function (a) {
      var actual = a.id === appId;
      var enlace = el("a", "ganemo-lanzador-app" + (actual ? " actual" : ""));
      enlace.href = a.url;
      enlace.title = a.descripcion || a.nombre;
      if (actual) {
        enlace.setAttribute("aria-current", "page");
      } else {
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
      }
      var icono = el("span", "ganemo-lanzador-icono", (a.inicial || a.nombre).slice(0, 2));
      icono.setAttribute("aria-hidden", "true");
      if (/^#[0-9a-fA-F]{6}$/.test(a.color)) icono.style.background = a.color;
      enlace.appendChild(icono);
      enlace.appendChild(el("span", "ganemo-lanzador-nombre", a.nombre));
      grilla.appendChild(enlace);
    });
    panel.appendChild(grilla);

    function abrir(si, devolverFoco, conTeclado) {
      panel.hidden = !si;
      boton.setAttribute("aria-expanded", si ? "true" : "false");
      if (si && conTeclado) {
        var primero = panel.querySelector("a");
        if (primero) primero.focus();
      } else if (devolverFoco) {
        boton.focus();
      }
    }
    boton.addEventListener("click", function (e) {
      e.stopPropagation();
      abrir(panel.hidden, false, e.detail === 0); // detail 0 = abierto con teclado: el foco pasa al panel
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !cont.contains(e.target)) abrir(false, false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) abrir(false, true);
    });
    cont.addEventListener("focusout", function (e) {
      if (!panel.hidden && e.relatedTarget && !cont.contains(e.relatedTarget)) abrir(false, false);
    });
    cont.appendChild(boton);
    cont.appendChild(panel);
    return cont;
  }

  /** Monta el menú. Devuelve una promesa con el elemento creado (o null si no corresponde mostrarlo). */
  function montar(op) {
    op = op || {};
    if (!op.correo) return Promise.resolve(null);
    return obtenerLista(op.urlLista, op.respaldo).then(function (datos) {
      if (!datos) return null;
      var apps = filtrar(datos, op.correo);
      if (apps.length < 2) return null;
      var cont = construir(apps, op.appId);
      if (op.contenedor) {
        op.contenedor.insertBefore(cont, op.contenedor.firstChild);
      } else {
        cont.classList.add("flotante");
        document.body.appendChild(cont);
      }
      return cont;
    });
  }

  global.GanemoMenu = { montar: montar, obtenerLista: obtenerLista, filtrar: filtrar, URL_LISTA: URL_LISTA };
})(window);
