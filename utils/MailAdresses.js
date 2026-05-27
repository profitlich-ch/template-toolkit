/**
 * Setzt `href` und Linktext aller Elemente mit `data-eml="local-part"` auf
 * `local-part@domain` (Spam-Schutz: Adresse erst per JS zusammengesetzt).
 */
export class MailAdresses {
    static #instance;

    #domain;

    /**
     * @param {string} domain - Domain-Teil der E-Mail-Adressen (z.B. 'example.com')
     */
    constructor(domain) {
        this.#domain = domain;
        this.init();
    }

    init() {
        document.querySelectorAll('[data-eml]').forEach(adresse => {
            let eml = adresse.getAttribute('data-eml');
            let emlText = eml + '@' + this.#domain;
            let emlAddress = 'mailto:' + emlText;
            adresse.setAttribute('href', emlAddress);
            adresse.innerHTML = emlText;
        });
    }

    /**
     * Holt die Singleton-Instanz. Beim ersten Aufruf muss `domain` übergeben werden.
     * @param {string} [domain]
     * @returns {MailAdresses}
     */
    static getInstance(domain) {
        if (!MailAdresses.#instance) {
            MailAdresses.#instance = new MailAdresses(domain);
        }
        return MailAdresses.#instance;
    }
}
