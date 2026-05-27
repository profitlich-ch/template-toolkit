import { Toolbar } from './toolbar/Toolbar.js';

let _config = {};

/**
 * Hinterlegt die Projekt-Config für die Dev-Toolbar.
 * @param {Object} [config={}] - Inhalt von `src/config.json` des Projekts.
 */
export function initDev(config = {}) {
    _config = config;
}

document.addEventListener('DOMContentLoaded', () => {
    new Toolbar();
    console.info('Dev initialized.');
});
