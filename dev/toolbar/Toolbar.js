import GUI from 'lil-gui';
import { MediaQueries } from '../../utils/MediaQueries.js';
import './toolbar.scss';

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

    constructor() {
        // State aus localStorage laden
        const defaults = { visible: false, grid: 'aus', imageSize: false, sizes: false, contentType: false };
        const saved = localStorage.getItem('devTools');
        this.#state = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;

        // Grid-Overlay DOM-Element erstellen
        const gridOverlay = document.createElement('div');
        gridOverlay.classList.add('dev-toolbar__grid');
        document.body.prepend(gridOverlay);

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
            .name('sizes')
            .onChange(() => this.#onStateChange());

        this.#gui.add(this.#state, 'contentType')
            .name('Inhaltstypen')
            .onChange(() => this.#onStateChange());

        // State anwenden
        this.#applyState();

        // Panel ein-/ausblenden
        if (!this.#state.visible) {
            this.#gui.hide();
        }

        // Event-Listener
        window.addEventListener('resize', this.#onResize);
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
        this.#updateImageSize();
        this.#updateSizes();
        this.#updateContentTypeLabels();
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
