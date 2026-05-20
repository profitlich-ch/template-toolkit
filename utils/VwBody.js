/**
 * Setzt --vw-body als 1% der scrollbar-freien Body-Breite.
 * Wird benötigt, wenn config.json vwBasis: "body" gesetzt hat.
 */
export class VwBody {
    static #instance;
    vw = 0;

    constructor() {
        this.#calculate();
        window.addEventListener('resize', () => {
            this.#calculate();
        });
    }

    #calculate() {
        this.vw = document.documentElement.clientWidth * 0.01;
        document.documentElement.style.setProperty('--vw-body', `${this.vw}px`);
    }

    static getInstance() {
        if (!VwBody.#instance) {
            VwBody.#instance = new VwBody();
        }
        return VwBody.#instance;
    }
}
