import path from 'node:path';
import { NodePackageImporter } from 'sass';
import { jsonToScss } from './jsonToScss.js';

/**
 * Bausteine für die `vite.config.js` eines Projekts.
 *
 * Jeder Baustein liefert die Optionen eines Bereichs der Vite-Konfiguration
 * (`define`, `build`, `server`, `css.preprocessorOptions.scss`). Das Projekt
 * setzt sie zusammen und ergänzt, was nur es selbst kennt – Entries, Plugins,
 * Pfade. Einzelne Werte überschreibt es direkt neben dem Baustein.
 */

/**
 * `define`-Einträge für Debug-Code.
 *
 * `__DEBUG__` wird zur Bauzeit durch ein Literal ersetzt. Aus `if (__DEBUG__)`
 * wird damit `if (false)`, und der Minifier entfernt den Zweig – Debug-Code
 * bleibt im Quelltext, erreicht die Produktion aber nicht.
 *
 * @param {string} mode - Vite-Mode (`development`, `staging`, `production`).
 * @returns {Object} Für `define`.
 */
export function defineDebug(mode) {
    // An `mode` gehängt, nicht an `import.meta.env.DEV`: Letzteres wäre auf
    // Staging bereits false und würde den Debug-Code dort verschlucken.
    return { __DEBUG__: mode !== 'production' };
}

/**
 * @typedef {Object} BuildOptions
 * @property {string} mode - Vite-Mode.
 * @property {string} outDir - Zielordner des Builds, z.B. `./web/dist/` (Craft) oder `public/dist` (Kirby).
 */

/**
 * Optionen für `build`: Manifest, Minifizierung, Sourcemaps.
 * Entries (`rollupOptions.input`) ergänzt das Projekt.
 *
 * @param {BuildOptions} options
 * @returns {Object} Für `build`.
 */
export function buildOptions({ mode, outDir }) {
    return {
        manifest: true,
        outDir,
        sourcemap: mode === 'development',
        emptyOutDir: true,
        // modulepreload können alle aktuellen Browser, das Polyfill wäre nur zusätzlicher Code
        modulePreload: { polyfill: false },
        minify: 'terser',
        // LightningCSS innerhalb der Vite-Pipeline, nicht als PostCSS-Plugin:
        // Als Plugin lief es nach Vites CSS-Transform und ersetzte gehashte
        // Asset-URLs wieder durch die ursprünglichen, relativen Pfade.
        cssMinify: 'lightningcss',
        terserOptions: {
            // console.* nur in Production-Builds entfernen; auf Staging hilft es beim Prüfen
            compress: { drop_console: mode === 'production' },
        },
    };
}

/**
 * @typedef {Object} ServerOptions
 * @property {Object} env - Ergebnis von `loadEnv()`; gelesen wird `PRIMARY_SITE_URL`.
 * @property {number} [port=5173] - Muss zu `.ddev/config.yaml` und der CMS-Vite-Konfiguration passen.
 */

/**
 * Optionen für `server`: Vite-Dev-Server im ddev-Container.
 *
 * @param {ServerOptions} options
 * @returns {Object} Für `server`.
 */
export function serverOptions({ env, port = 5173 }) {
    return {
        host: '0.0.0.0',
        port,
        strictPort: true,
        origin: `${env.PRIMARY_SITE_URL.replace(/:\d+$/, '')}:${port}`,
        cors: {
            origin: /https?:\/\/([A-Za-z0-9\-.]+)?(\.ddev\.site)(?::\d+)?$/,
        },
        watch: {
            ignored: ['**/node_modules/**', '**/vendor/**'],
        },
    };
}

/**
 * @typedef {Object} ScssOptions
 * @property {Object} configJson - Inhalt von `src/config.json`; per `@use 'config'` als SCSS-Variablen verfügbar.
 * @property {string[]} [loadPaths=['src/scss']] - Relativ zum Projektverzeichnis.
 */

/**
 * Optionen für `css.preprocessorOptions.scss`: Paket-Importe, `config.json`
 * als SCSS-Modul und – wenn `configJson.fonts` Schriften nennt – die
 * Capsize-Funktionen.
 *
 * @param {ScssOptions} options
 * @returns {Promise<Object>} Für `css.preprocessorOptions.scss`.
 */
export async function scssOptions({ configJson, loadPaths = ['src/scss'] }) {
    const options = {
        api: 'modern',
        importers: [
            new NodePackageImporter(),
            {
                canonicalize(url) {
                    return url === 'config' ? new URL('custom:config') : null;
                },
                load(canonicalUrl) {
                    if (canonicalUrl.toString() !== 'custom:config') return null;
                    return { contents: jsonToScss(configJson), syntax: 'scss' };
                },
            },
        ],
        loadPaths: loadPaths.map((p) => path.resolve(process.cwd(), p)),
    };

    // Erst bei Bedarf laden: Capsize braucht die optionalen Pakete @capsizecss/*,
    // die nur Projekte mit Schriftdateien installiert haben.
    if (configJson.fonts && Object.keys(configJson.fonts).length > 0) {
        const { createCapsizeFunctions } = await import('./capsizeSassFunctions.js');
        options.functions = await createCapsizeFunctions(configJson.fonts);
    }

    return options;
}
