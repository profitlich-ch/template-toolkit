import './menu-toggle.scss';

export class MenuToggle {
    static #instance;
    #menuButton;
    #menu;
    #menuLinkSelector;
    #menuItemSelector;
    #scrollbarWidth;
    #shiftElement;
    #shiftDelay;
    #deferPositionFixed;
    #lockScroll;
    #fixElement;
    #y;
    #bodyClickHandler;
    #resizeHandler;
    #escapeHandler;
    isActive;

    /**
     * @param {Object}  options
     * @param {string}  options.menuButtonSelector    CSS-Selektor (`querySelector`) des Buttons, der das Menü öffnet/schliesst.
     * @param {string}  options.menuSelector          CSS-Selektor (`querySelector`) des Menü-Containers.
     * @param {string}  options.menuLinkSelector      CSS-Selektor für Menü-Links, die das Menü beim Klick schliessen (z.B. '.menu-link').
     * @param {string}  options.menuItemSelector      CSS-Selektor des Menü-Wrappers; Klicks ausserhalb schliessen das Menü (z.B. '.menu').
     * @param {string?} options.shiftElementSelector  Optional: CSS-Selektor des Elements, das beim Öffnen um die Scrollbar-Breite verschoben/verbreitert wird, damit z.B. ein fixierter Header nicht springt.
     * @param {number}  options.shiftDelay            Verzögerung in Sekunden, bevor Scrollbar gemessen und Body fixiert wird – nützlich, wenn vorher noch eine CSS-Animation läuft, die die Scrollbar entfernt.
     * @param {boolean} options.deferPositionFixed    Setzt `data-menu-fixed` erst nach `shiftDelay` statt sofort. Nötig, wenn das Fixieren eine laufende Öffnungs-Animation stören würde.
     * @param {boolean} options.lockScroll            Wenn `false`, bleibt das fixierende Element scrollbar; kein Scrollbar-Ausgleich und kein Shift. Für Menüs, die nur einen Teil der Seite bedecken und Hintergrund-Scroll erlauben sollen.
     * @param {string?} options.fixElementSelector    Optional: CSS-Selektor des Elements, das beim Öffnen fixiert wird (`position: fixed`, Scrollbar-Ausgleich, Scroll-Position-Trick). Default: `document.body`.
     */
    constructor({
        menuButtonSelector,
        menuSelector,
        menuLinkSelector,
        menuItemSelector,
        shiftElementSelector = null,
        shiftDelay = 0,
        deferPositionFixed = false,
        lockScroll = true,
        fixElementSelector = null,
    }) {
        this.#menuButton = document.querySelector(menuButtonSelector);
        this.#menu = document.querySelector(menuSelector);
        this.#menuLinkSelector = menuLinkSelector;
        this.#menuItemSelector = menuItemSelector;
        this.#shiftElement = shiftElementSelector ? document.querySelector(shiftElementSelector) : null;
        this.#shiftDelay = shiftDelay * 1000;
        this.#deferPositionFixed = deferPositionFixed;
        this.#lockScroll = lockScroll;
        this.#fixElement = fixElementSelector ? document.querySelector(fixElementSelector) : document.body;
        this.#scrollbarWidth = 0;
        this.isActive = false;
        this.#y = 0;

        this.#bodyClickHandler = this.#onBodyClick.bind(this);
        this.#resizeHandler = this.#onResize.bind(this);
        this.#escapeHandler = this.#onEscape.bind(this);

        this.#menuButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.#toggleMenu();
        });

        this.#menu.addEventListener('click', (event) => {
            if (this.isActive && event.target.matches(this.#menuLinkSelector)) {
                this.#toggleMenu();
            }
        });

        this.#setBodyAttribute('data-menu-active', 'false');
        this.#setBodyAttribute('data-menu-moving', 'false');
        this.#fixElement.setAttribute('data-menu-fixed', 'false');
    }

    static getInstance(options) {
        if (!MenuToggle.#instance) {
            if (!options || !options.menuButtonSelector || !options.menuSelector || !options.menuLinkSelector || !options.menuItemSelector) {
                throw new Error("MenuToggle muss beim ersten Aufruf mit menuButtonSelector, menuSelector, menuLinkSelector und menuItemSelector initialisiert werden.");
            }
            MenuToggle.#instance = new MenuToggle(options);
        }
        return MenuToggle.#instance;
    }

    #toggleMenu() {
        if (this.isActive) {
            this.isActive = false;
            document.body.removeEventListener('click', this.#bodyClickHandler);
            window.removeEventListener('resize', this.#resizeHandler);
            this.#setBodyAttribute('data-menu-active', 'false');
            if (this.#lockScroll) {
                this.#fixElement.setAttribute('data-menu-fixed', 'false');
                if (this.#shiftElement) {
                    this.#shiftElement.style.marginRight = '';
                    this.#shiftElement.style.width = '';
                }
                this.#fixElement.style.paddingRight = '';
                this.#fixElement.style.top = '';
                window.scrollTo(0, this.#y);
            }
            this.#toggleEscape(false);
        } else {
            this.isActive = true;
            document.body.addEventListener('click', this.#bodyClickHandler);
            this.#setBodyAttribute('data-menu-active', 'true');
            if (this.#lockScroll) {
                window.addEventListener('resize', this.#resizeHandler);
                this.#setBodyAttribute('data-menu-moving', 'true');
                if (!this.#deferPositionFixed) {
                    this.#fixElement.setAttribute('data-menu-fixed', 'true');
                }
                setTimeout(() => {
                    this.#scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
                    this.#y = window.scrollY;
                    this.#fixElement.style.paddingRight = `${this.#scrollbarWidth}px`;
                    this.#fixElement.style.top = `-${this.#y}px`;
                    if (this.#deferPositionFixed) {
                        this.#fixElement.setAttribute('data-menu-fixed', 'true');
                    }
                    if (this.#shiftElement) {
                        const marginOriginal = parseFloat(window.getComputedStyle(this.#menuButton).marginRight);
                        this.#shiftElement.style.marginRight = `${marginOriginal + this.#scrollbarWidth}px`;
                        this.#adjustShiftElementWidth();
                    }
                    this.#setBodyAttribute('data-menu-moving', 'false');
                }, this.#shiftDelay);
            }
            this.#toggleEscape(true);
        }
        const event = new CustomEvent('eventMenuestatus', {
            detail: { menueStatus: this.isActive }
        });
        document.dispatchEvent(event);
    }

    #adjustShiftElementWidth() {
        const contentWidth = document.documentElement.clientWidth;
        this.#shiftElement.style.width = `${contentWidth - this.#scrollbarWidth}px`;
    }

    #onBodyClick(event) {
        if (this.isActive && !event.target.closest(this.#menuItemSelector)) {
            this.#toggleMenu();
        }
    }

    #onResize() {
        if (this.#shiftElement) {
            this.#adjustShiftElementWidth();
        }
    }

    #setBodyAttribute(attr, value) {
        document.body.setAttribute(attr, value);
    }

    #toggleEscape(status) {
        if (status) {
            document.addEventListener('keydown', this.#escapeHandler);
        } else {
            document.removeEventListener('keydown', this.#escapeHandler);
        }
    }

    #onEscape(event) {
        if (event.key === 'Escape') {
            this.#toggleMenu();
        }
    }
}
