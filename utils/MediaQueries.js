/**
 * Verwaltet Layout-Wechsel anhand von Breakpoints. Setzt `data-layout` am Body
 * und feuert das Custom-Event `eventLayoutchange` bei jedem Wechsel.
 * Siehe https://kinsta.com/blog/javamediaqueryipt-media-query/ (Option 3).
 *
 * @typedef {Object<string, number|null>} BreakpointsConfig
 *   Map: Layout-Name → minimale Viewport-Breite in Pixeln (oder `null` für das kleinste Layout).
 *   Reihenfolge der Keys bestimmt die Layout-Priorität (späteres Match überschreibt früheres).
 */

export class MediaQueries {
    static #instance;
    layout = 'desktop';
    #breakpoints;

    /**
     * @param {BreakpointsConfig} breakpoints
     */
    constructor(breakpoints) {
        this.#breakpoints = breakpoints;
        this.layout = 'desktop';
        this.changeLayout();
        this.#matchmedia();
    }

    /**
     * Holt die Singleton-Instanz. Beim ersten Aufruf müssen `breakpoints` übergeben werden.
     * @param {BreakpointsConfig} [breakpoints]
     * @returns {MediaQueries}
     */
    static getInstance(breakpoints) {
        if (!MediaQueries.#instance) {
            if (!breakpoints) {
                throw new Error("MediaQueries muss beim ersten Aufruf mit breakpoints initialisiert werden.");
            }
            MediaQueries.#instance = new MediaQueries(breakpoints);
        }
        return MediaQueries.#instance;
    }

    #matchmedia() {
        for (let [layout, minSize] of Object.entries(this.#breakpoints)) {
            if (minSize) {
                var matchmedia = window.matchMedia('(min-width: ' + minSize + 'px)');
                matchmedia.addEventListener('change', (e) => this.changeLayout());
            }
        }
    }

    // media query handler function
    changeLayout() {
        for (let [layout, minSize] of Object.entries(this.#breakpoints)) {
            var matchmedia = window.matchMedia('(min-width: ' + minSize + 'px)');
            if (!matchmedia || matchmedia.matches) {
                this.layout = layout;
            }
        }
        document.body.setAttribute('data-layout', this.layout);

        // create event
        let event = new CustomEvent('eventLayoutchange', {
            detail: {
                layout: this.layout
            }
        });
        // dispatch the event
        window.dispatchEvent(event);
    }
}
