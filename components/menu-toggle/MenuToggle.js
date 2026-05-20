import './menu-toggle.scss';

export class MenuToggle {
    static #instance;
    #menuButton;
    #menu;
    #menuLinkSelector;
    #menuItemClass;
    #scrollbarWidth;
    #shiftElement;
    #shiftDelay;
    #deferPositionFixed;
    #fixBody;
    #y;
    #bodyClickHandler;
    #resizeHandler;
    #escapeHandler;
    isActive;

    /**
     * @param {Object}  options
     * @param {string}  options.menuButtonId        ID des Buttons, der das Menü öffnet/schliesst.
     * @param {string}  options.menuId              ID des Menü-Containers.
     * @param {string}  options.menuLinkSelector    Selektor für Menü-Links, die das Menü beim Klick schliessen (z.B. '.menu-link').
     * @param {string}  options.menuItemClass       Klassenname (ohne Punkt) des Menü-Wrappers; Klicks ausserhalb schliessen das Menü.
     * @param {string?} options.shiftElementId      Optional: Element, das beim Öffnen um die Scrollbar-Breite verschoben/verbreitert wird, damit z.B. ein fixierter Header nicht springt.
     * @param {number}  options.shiftDelay          Verzögerung in Sekunden, bevor Scrollbar gemessen und Body fixiert wird – nützlich, wenn vorher noch eine CSS-Animation läuft, die die Scrollbar entfernt.
     * @param {boolean} options.deferPositionFixed  Setzt `data-menu-fixed` erst nach `shiftDelay` statt sofort. Nötig, wenn das Fixieren eine laufende Öffnungs-Animation stören würde.
     * @param {boolean} options.fixBody             Wenn `false`, bleibt der Body scrollbar; kein Scrollbar-Ausgleich und kein Shift. Für Menüs, die nur einen Teil der Seite bedecken und Hintergrund-Scroll erlauben sollen.
     */
    constructor({
        menuButtonId,
        menuId,
        menuLinkSelector,
        menuItemClass,
        shiftElementId = null,
        shiftDelay = 0,
        deferPositionFixed = false,
        fixBody = true,
    }) {
        this.#menuButton = document.getElementById(menuButtonId);
        this.#menu = document.getElementById(menuId);
        this.#menuLinkSelector = menuLinkSelector;
        this.#menuItemClass = menuItemClass;
        this.#shiftElement = shiftElementId ? document.getElementById(shiftElementId) : null;
        this.#shiftDelay = shiftDelay * 1000;
        this.#deferPositionFixed = deferPositionFixed;
        this.#fixBody = fixBody;
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
        this.#setBodyAttribute('data-menu-fixed', 'false');
    }

    static getInstance(options) {
        if (!MenuToggle.#instance) {
            if (!options || !options.menuButtonId || !options.menuId || !options.menuLinkSelector || !options.menuItemClass) {
                throw new Error("MenuToggle muss beim ersten Aufruf mit menuButtonId, menuId, menuLinkSelector und menuItemClass initialisiert werden.");
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
            if (this.#fixBody) {
                this.#setBodyAttribute('data-menu-fixed', 'false');
                if (this.#shiftElement) {
                    this.#shiftElement.style.marginRight = '';
                    this.#shiftElement.style.width = '';
                }
                document.body.style.paddingRight = '';
                document.body.style.top = '';
                window.scrollTo(0, this.#y);
            }
            this.#toggleEscape(false);
        } else {
            this.isActive = true;
            document.body.addEventListener('click', this.#bodyClickHandler);
            this.#setBodyAttribute('data-menu-active', 'true');
            if (this.#fixBody) {
                window.addEventListener('resize', this.#resizeHandler);
                this.#setBodyAttribute('data-menu-moving', 'true');
                if (!this.#deferPositionFixed) {
                    this.#setBodyAttribute('data-menu-fixed', 'true');
                }
                setTimeout(() => {
                    this.#scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
                    this.#y = window.scrollY;
                    document.body.style.paddingRight = `${this.#scrollbarWidth}px`;
                    document.body.style.top = `-${this.#y}px`;
                    if (this.#deferPositionFixed) {
                        this.#setBodyAttribute('data-menu-fixed', 'true');
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
        if (this.isActive && !event.target.closest('.' + this.#menuItemClass)) {
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
