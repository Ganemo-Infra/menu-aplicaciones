# menu-aplicaciones — lista única del menú de aplicaciones de Ganemo

Fuente única de las aplicaciones que aparecen en el **menú de 9 puntos** de las apps internas de Ganemo
(Jenkins, Hangar (Coder) y las que vengan).

- **Lista publicada:** `https://ganemo-infra.github.io/menu-aplicaciones/v1/aplicaciones.json`
  (GitHub Pages: CDN, CORS abierto `Access-Control-Allow-Origin: *`, caché de 10 min).
- **Contrato:** [`v1/esquema.json`](v1/esquema.json). Campos: `id`, `nombre`, `descripcion`, `url`, `color`,
  `inicial`, `visibilidad` (`todos` | `personal`), `orden`.
- **Implementación de referencia** sin dependencias: [`referencia/menu.js`](referencia/menu.js) +
  [`referencia/menu.css`](referencia/menu.css). Demostración: la raíz del sitio.
- **Ruta versionada estable (la que cargan las apps):**
  `https://ganemo-infra.github.io/menu-aplicaciones/v1/menu.js` y `.../v1/menu.css`. No existen en git: el
  workflow de Pages copia `referencia/menu.js` y `referencia/menu.css` a `v1/` al publicar (fuente única, nunca
  divergen). `referencia/` se mantiene publicada. Las apps cargan `v1/`; un cambio incompatible exigiría publicar
  `v2/` y dejar `v1/` intacta.

## Opción `credenciales`

`GanemoMenu.montar({ ..., credenciales: "omit" })` se pasa a `fetch(urlLista, { credentials })`. Valores:
`"omit"` (por defecto, como siempre), `"same-origin"` o `"include"`; cualquier otro valor se trata como `"omit"`.

Motivo: apps como Glux sirven la lista filtrada por persona desde su propio servidor con sesión
(`/_ganemo/aplicaciones.json`, mismo origen) y necesitan enviar la cookie. Con la URL pública de GitHub Pages se
deja el valor por defecto.
- **Guía completa** (especificación visual, recetas por tipo de app, reglas): Blenau
  `company/infra/menu-de-aplicaciones.md`.

## Cambiar la lista

1. PR que edite `v1/aplicaciones.json` (y `actualizado`). La CI corre `validar.py`: esquema, ids/orden/URL únicos,
   contraste del color con texto blanco ≥ 4,5:1 y que no haya correos.
2. Al fusionar en `main` se publica sola (~1 min) y las apps la ven en ≤ 10 min (Jenkins y Coder la refrescan
   del lado del servidor).
3. Actualizar la tabla de Blenau (`company/infra/menu-de-aplicaciones.md`, sección «La lista»).

## Reglas

- **Repo público a propósito:** solo nombres y URLs de apps internas que ya son públicas en DNS. Nunca correos,
  clientes, tokens ni URLs con parámetros.
- **Compatibilidad:** los consumidores ignoran campos nuevos. Un cambio incompatible publica `v2/` y deja `v1/`.
- **El menú no da permisos:** cada app decide quién entra. `visibilidad` solo decide quién ve el icono, y una app
  puede ocultar más con sus permisos, nunca mostrar más.
