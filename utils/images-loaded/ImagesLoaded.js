import './images-loaded.scss';

/**
 * Steuert das sanfte Einblenden von Bildern, die nativ (loading="lazy") geladen wurden.
 * Fügt dem Bild das Attribut 'loaded="true"' hinzu, sobald der Ladevorgang erfolgreich abgeschlossen ist.
 */
export class ImagesLoaded {
    #selector;
    #attributeName;
    #attributeValue;

    constructor(selector, loadedAttribute = 'data-loaded', loadedValue = 'true') {
        this.#selector = selector;
        this.#attributeName = loadedAttribute;
        this.#attributeValue = loadedValue;

        // Führt die Initialisierung erst nach dem vollständigen Laden des DOM aus.
        document.addEventListener('DOMContentLoaded', this.#init.bind(this));
    }

    #init() {
        const images = document.querySelectorAll(this.#selector);
        images.forEach(img => this.#setupImage(img));
    }

    #setupImage(img) {
        // Prüfen auf geladenen Zustand und gültige Dimensionen
        if (img.complete && img.naturalHeight > 0) {
            this.#signalLoaded(img);
        } else {
            // Ansonsten auf das erfolgreiche Lade-Event warten
            img.addEventListener('load', () => this.#signalLoaded(img));

            // Fehlerbehandlung (optional)
            img.addEventListener('error', () => {
                console.warn(`[ImagesLoaded] Ladevorgang fehlgeschlagen für: ${img.src}`);
            });
        }
    }

    #signalLoaded(img) {
        img.setAttribute(this.#attributeName, this.#attributeValue);
    }
}