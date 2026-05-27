/**
 * Setzt beim ersten Scroll-Event das Body-Attribut `data-body-scrolled="true"`
 * und feuert das Custom-Event `eventBodyScrolled`. Einmal pro Seitenaufruf.
 */
export class BodyScrolled {
    static #instance;

    constructor() {
        document.addEventListener('scroll', function setScrolled() {
            document.body.setAttribute('data-body-scrolled', 'true');
            this.removeEventListener('scroll', setScrolled);

            // create event
            let event = new CustomEvent('eventBodyScrolled', {
                detail: {
                    scrolled: true
                }
            });
            // dispatch the event
            window.dispatchEvent(event);
        });

    }

    /**
     * Holt die Singleton-Instanz und initialisiert beim ersten Aufruf den Scroll-Listener.
     * @returns {BodyScrolled}
     */
    static getInstance() {
        if (!BodyScrolled.#instance) {
            BodyScrolled.#instance = new BodyScrolled();
        }
        return BodyScrolled.#instance;
    }
}
