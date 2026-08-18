import { Toolbar } from './toolbar/Toolbar.js';

let _config = {};
let _options = {};

/**
 * Hinterlegt die Projekt-Config für die Dev-Toolbar.
 * @param {Object} [config={}] - Inhalt von `src/config.json` des Projekts.
 * @param {import('./toolbar/Toolbar.js').ToolbarOptions} [options={}] - Projekteigene
 *   Ergänzungen der Toolbar, derzeit `toggles`.
 */
export function initDev(config = {}, options = {}) {
    _config = config;
    _options = options;
}

document.addEventListener('DOMContentLoaded', () => {
    new Toolbar(_options);
    console.info('Dev initialized.');
});
