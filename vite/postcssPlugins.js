import postcssInputRange from 'postcss-input-range';
import postcssBreakpointDry from './postcssBreakpointDry.js';

/**
 * Die PostCSS-Plugins aller Toolkit-Projekte, für `plugins` in
 * `postcss.config.js`. Das Projekt kann weitere anhängen.
 *
 * - `postcss-input-range`: übersetzt `::range-thumb`/`::range-track` für
 *   Schieberegler in die browserspezifischen Pseudo-Elemente.
 * - `postcssBreakpointDry`: warnt bei Wiederholungen über Breakpoints hinweg.
 *
 * Minifiziert wird nicht hier, sondern über `cssMinify` in den Build-Optionen
 * (siehe `buildOptions` in `vite/config.js`).
 *
 * @returns {import('postcss').AcceptedPlugin[]}
 */
export function postcssPlugins() {
    return [postcssInputRange(), postcssBreakpointDry()];
}
