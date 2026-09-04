import GUI from 'lil-gui';
import { canvasGridLines } from 'canvas-grid-lines';
import { MediaQueries } from '../../utils/MediaQueries.js';
import { gridColumnsTriple } from './gridColumns.js';
import './toolbar.scss';

/**
 * Übersetzt die Auswahl im Grid-Menü in die Rasterart von `canvas-grid-lines`.
 * Die Namen der Auswahl bleiben, wie sie waren — sie stehen im gespeicherten
 * State der Toolbar und wären sonst bei jedem ein Rückschritt auf `aus`.
 *
 * Die Farben standen früher als Sass-Variablen in `toolbar.scss`. Ein Canvas
 * bekommt sie zur Laufzeit, deshalb stehen sie jetzt hier.
 */
const GRID_MODES = {
    lines: { gridType: 'columns', color: 'rgba(0, 0, 255, 0.5)' },
    ribbons: { gridType: 'ribbons', color: 'rgba(191, 255, 254, 0.5)' },
};

/**
 * Beschreibt eine projekteigene Checkbox in der Dev-Toolbar.
 * @typedef {Object} ToolbarToggle
 * @property {string} key - Schlüssel im State und in `localStorage.devTools`.
 * @property {string} name - Beschriftung in der Toolbar.
 * @property {string} [attribute] - Data-Attribut am `<body>`. Ohne Angabe aus dem
 *   Schlüssel abgeleitet: `navigateSpace` → `data-dev-navigate-space`.
 * @property {boolean} [default=false] - Startwert, solange nichts gespeichert ist.
 */

/**
 * Optionen, mit denen ein Projekt die Toolbar erweitert.
 * @typedef {Object} ToolbarOptions
 * @property {ToolbarToggle[]} [toggles=[]] - Zusätzliche Checkboxen.
 */

/**
 * Dev-Toolbar (lil-gui) mit Grid-Overlay, Bildgrössen- und Inhaltstyp-Labels.
 * State wird in `localStorage.devTools` persistiert. Toggle via `Ctrl`.
 */
export class Toolbar {
    #mediaQueries = MediaQueries.getInstance();
    #gui;
    #state;
    #pictureElements;
    #contentTypeContainer;
    #toggles;
    #config;
    #gridElement;
    #grid = null;

    /**
     * @param {ToolbarOptions} [options={}] - Projekteigene Ergänzungen.
     * @param {Object} [config={}] - Inhalt von `src/config.json` des Projekts.
     *   Das Grid-Overlay leitet Spaltenzahl, Gutter und Seitenränder daraus ab.
     */
    constructor(options = {}, config = {}) {
        this.#toggles = options.toggles ?? [];
        this.#config = config;

        // State aus localStorage laden
        const defaults = { visible: false, grid: 'aus', imageSize: false, sizes: false, contentType: false };
        for (const toggle of this.#toggles) {
            defaults[toggle.key] = toggle.default ?? false;
        }
        const saved = localStorage.getItem('devTools');
        this.#state = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;

        // Grid-Overlay DOM-Element erstellen. Das Canvas darin entsteht erst
        // beim ersten Einschalten — es ist eine Bitmap in Viewportgrösse, und
        // die soll nicht zahlen, wer das Raster gar nicht anschaut.
        this.#gridElement = document.createElement('div');
        this.#gridElement.classList.add('dev-toolbar__grid');
        document.body.prepend(this.#gridElement);

        // Content-Type-Label-Overlay erstellen
        this.#contentTypeContainer = document.createElement('div');
        this.#contentTypeContainer.classList.add('dev-toolbar__content-types');
        document.body.prepend(this.#contentTypeContainer);

        // Picture-Elemente sammeln
        this.#pictureElements = document.getElementsByTagName('picture');

        // lil-gui initialisieren
        this.#gui = new GUI({ title: this.#getViewportText() });

        this.#gui.add(this.#state, 'grid', ['aus', 'lines', 'ribbons'])
            .name('Grid')
            .onChange(() => this.#onStateChange());

        this.#gui.add(this.#state, 'imageSize')
            .name('Bildgrössen')
            .onChange(() => this.#onStateChange());

        this.#gui.add(this.#state, 'sizes')
            .name('Sizes')
            .onChange(() => this.#onStateChange());

        this.#gui.add(this.#state, 'contentType')
            .name('Inhaltstypen')
            .onChange(() => this.#onStateChange());

        // Projekteigene Schalter ans Ende, damit die Reihenfolge der festen
        // Einträge über alle Projekte hinweg gleich bleibt
        for (const toggle of this.#toggles) {
            this.#gui.add(this.#state, toggle.key)
                .name(toggle.name)
                .onChange(() => this.#onStateChange());
        }

        // State anwenden
        this.#applyState();

        // Panel ein-/ausblenden
        if (!this.#state.visible) {
            this.#gui.hide();
        }

        // Event-Listener
        window.addEventListener('resize', this.#onResize);
        window.addEventListener('eventLayoutchange', this.#onLayoutChange);
        document.addEventListener('keydown', this.#handleKeyDown);
    }

    #getViewportText() {
        return `${this.#mediaQueries.layout} @ ${window.innerWidth}×${window.innerHeight}`;
    }

    #onStateChange() {
        this.#applyState();
        this.#saveState();
    }

    #applyState() {
        document.body.setAttribute('data-dev-grid', this.#state.grid);
        document.body.setAttribute('data-dev-content-types', this.#state.contentType);
        this.#updateGrid();
        this.#applyToggles();
        this.#updateImageSize();
        this.#updateSizes();
        this.#updateContentTypeLabels();
    }

    /**
     * Baut das Raster beim ersten Einschalten und hält es danach auf dem Stand
     * von Auswahl und Layout. Im Modus `aus` geschieht nichts — das Ausblenden
     * erledigt allein `data-dev-grid` in der CSS.
     */
    #updateGrid() {
        const mode = GRID_MODES[this.#state.grid];
        if (!mode) return;

        const columns = gridColumnsTriple(this.#config, this.#mediaQueries.layout);
        if (!columns) return;

        if (!this.#grid) {
            [this.#grid] = canvasGridLines.initGrid({
                targets: this.#gridElement,
                gridType: mode.gridType,
                columns,
                color: mode.color,
                lineWidth: 1,
                units: 'devicepixel',
            }) ?? [];
            return;
        }

        // Reihenfolge: erst die Spalten, dann die Rasterart. Der gridType-Setter
        // leitet sein Lückenmuster aus dem aktuellen columns-Wert ab, und der
        // muss nach einem Breakpoint-Wechsel schon der neue sein.
        this.#grid.columns = columns;
        this.#grid.gridType = mode.gridType;
        this.#grid.color = mode.color;
    }

    #onLayoutChange = () => {
        this.#updateGrid();
    }

    #updateContentTypeLabels() {
        this.#contentTypeContainer.innerHTML = '';
        if (!this.#state.contentType) return;
        document.querySelectorAll('[data-content-type]').forEach(el => {
            const rect = el.getBoundingClientRect();
            const label = document.createElement('div');
            label.className = 'dev-toolbar__content-type-label';
            label.textContent = el.dataset.contentType;
            label.style.left = `${rect.left + window.scrollX}px`;
            label.style.top = `${rect.top + window.scrollY}px`;
            this.#contentTypeContainer.appendChild(label);
        });
    }

    /**
     * Schreibt jeden projekteigenen Schalter als Data-Attribut ans `<body>` und
     * meldet ihn zusätzlich per Event.
     *
     * Beides, weil beide Seiten gebraucht werden: Das Attribut genügt für reines
     * CSS und gilt auch für Listener, die es zum Zeitpunkt des Umschaltens noch
     * nicht gab; das Event erreicht Module, die auf den Wechsel reagieren müssen,
     * statt ihn nur darzustellen.
     */
    #applyToggles() {
        for (const toggle of this.#toggles) {
            const value = this.#state[toggle.key];
            document.body.setAttribute(toggleAttribute(toggle), String(value));
            document.dispatchEvent(new CustomEvent('eventDevToggle', {
                detail: { key: toggle.key, value },
            }));
        }
    }

    #saveState() {
        localStorage.setItem('devTools', JSON.stringify(this.#state));
    }

    #updateImageSize() {
        if (!this.#pictureElements) return;
        const pictures = Array.from(this.#pictureElements);
        if (this.#state.imageSize) {
            const windowWidth = window.innerWidth;
            pictures.forEach((picture) => {
                picture.setAttribute('data-dev-size', `${Math.round(picture.offsetWidth / windowWidth * 100)}vw`);
            });
        } else {
            pictures.forEach((picture) => {
                picture.setAttribute('data-dev-size', '');
            });
        }
    }

    #updateSizes() {
        if (!this.#pictureElements) return;
        const pictures = Array.from(this.#pictureElements);
        if (this.#state.sizes) {
            pictures.forEach((picture) => {
                const sizes = picture.querySelector('img')?.getAttribute('sizes');
                if (!sizes) {
                    picture.setAttribute('data-dev-sizes', '');
                    return;
                }
                // Media-Conditions in Klammern entfernen, nur die Längenwerte behalten
                const shortened = sizes
                    .split(',')
                    .map(part => part.replace(/\([^)]*\)/g, '').trim())
                    .filter(Boolean)
                    .join(' / ');
                picture.setAttribute('data-dev-sizes', shortened);
            });
        } else {
            pictures.forEach((picture) => {
                picture.setAttribute('data-dev-sizes', '');
            });
        }
    }

    #onResize = () => {
        this.#gui.title(this.#getViewportText());
        this.#updateImageSize();
        this.#updateSizes();
        this.#updateContentTypeLabels();
    }

    #handleKeyDown = (event) => {
        if (event.key === 'Control') {
            event.preventDefault();
            this.#state.visible = !this.#state.visible;
            if (this.#state.visible) {
                this.#gui.show();
            } else {
                this.#gui.hide();
            }
            this.#saveState();
        }
    }
}

/**
 * Liefert das Data-Attribut eines Schalters — die explizite Angabe, sonst aus dem
 * Schlüssel abgeleitet: `navigateSpace` → `data-dev-navigate-space`.
 * @param {ToolbarToggle} toggle
 * @returns {string}
 */
function toggleAttribute(toggle) {
    return toggle.attribute
        ?? `data-dev-${toggle.key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`;
}
