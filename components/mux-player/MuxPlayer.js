import '@mux/mux-player';
import './mux-player.scss';

/**
 * @typedef {Object} MuxPlayerOptions
 * @property {boolean} [loop=false]            Wiederholt das Video nach Ende.
 * @property {boolean} [noLowRes=false]        Setzt `minResolution` anhand der physischen Container-Grösse, damit auf hochauflösenden Displays keine zu kleine Auflösung gespielt wird.
 * @property {((player: HTMLElement, container: HTMLElement) => void)} [onPlayerCreated] Callback, der nach jedem Lazy-Load-Setup aufgerufen wird (unabhängig von Autoplay).
 * @property {boolean} [disableTracking=false] Setzt das `disable-tracking`-Attribut am Player — verhindert das Mux-Data-Tracking.
 * @property {string}  [envKey]                Mux-Data-Env-Key. Nur wirksam, wenn `disableTracking=false`.
 * @property {Object}  [metadata]              Mux-Data-Metadata-Objekt. Nur wirksam, wenn `envKey` gesetzt ist.
 */

/**
 * Lädt Mux-Videos lazy und steuert Autoplay per IntersectionObserver.
 *
 * Ladereihenfolge:
 * 1. observeLazyElements() beobachtet alle .mux-player-Container.
 * 2. Betritt ein Container den Viewport, ersetzt #handleLazyLoad ihn durch
 *    ein <mux-player>-Element und ruft handleVisibilityChange auf.
 * 3. handleVisibilityChange → #setup für alle sichtbaren Videos:
 *    - Autoplay: muted, Controls versteckt, #playPauseObserver startet
 *    - Kein Autoplay: keine Änderungen, User steuert Wiedergabe selbst
 *    - display:none beim Laden: Setup wird übersprungen; Projekt ruft
 *      handleVisibilityChange erneut auf, sobald das Video sichtbar wird.
 * 4. onPlayerCreated (optional): wird für alle Player aufgerufen, unabhängig
 *    von Autoplay und nach dem internen Setup.
 *
 * Pausierlogik:
 * - Viewport verlassen → #handlePlayPause via IntersectionObserver (nur Autoplay)
 * - display:none gesetzt → handleVisibilityChange (manuell vom Projekt aufzurufen)
 */
export class MuxPlayer {
    #lazyLoadObserver;
    #playPauseObserver;
    #loop;
    #noLowRes;
    #onPlayerCreated;
    #disableTracking;
    #envKey;
    #metadata;

    /**
     * @param {MuxPlayerOptions} [options]
     */
    constructor({
        loop = false,
        noLowRes = false,
        onPlayerCreated = null,
        disableTracking = false,
        envKey = null,
        metadata = null,
    } = {}) {
        this.#loop = loop;
        this.#noLowRes = noLowRes;
        this.#onPlayerCreated = onPlayerCreated;
        this.#disableTracking = disableTracking;
        this.#envKey = envKey;
        this.#metadata = metadata;
        this.#lazyLoadObserver = new IntersectionObserver(this.#handleLazyLoad.bind(this));
        this.#playPauseObserver = new IntersectionObserver(this.#handlePlayPause.bind(this));
    }

    observeLazyElements() {
        document.querySelectorAll('.mux-player').forEach(el => {
            this.#lazyLoadObserver.observe(el);
        });
    }

    #setup(player) {
        // Guard Clause: Führe das Setup nur aus, wenn es noch nicht passiert ist.
        if (player.dataset.isSetup === 'true') {
            return;
        }

        const autoplay = player.dataset.autoplay === 'true';
        if (autoplay) player.muted = true;
        if (autoplay) player.style.setProperty('--controls', 'none');
        if (this.#loop) player.loop = true;

        // Flag setzen, um zukünftige Ausführungen zu verhindern.
        player.dataset.isSetup = 'true';

        if (autoplay) {
            // Kein Warten auf loadeddata: Das Event feuert auf Mobile bei aktivem
            // Data-Saver gar nicht (MDN) und auf iOS Safari mit nativem HLS oft erst
            // nach dem ersten play()-Aufruf. IntersectionObserver feuert beim observe()
            // direkt mit dem aktuellen Status — play() darf vor loadeddata aufgerufen
            // werden, der Browser kümmert sich ums Buffering.
            this.#playPauseObserver.observe(player);
        }
    }

    // Für Videos, die ein-/ausgeblendet werden
    // zum Beispiel Startseite Angebote
    handleVisibilityChange(player) {
        const isVisible = window.getComputedStyle(player).display !== 'none';

        if (isVisible && player.dataset.isSetup !== 'true') {
            this.#setup(player);
        } else if (!isVisible) {
            this.#playPauseObserver.unobserve(player);
            player.pause();
        }
    }

    #handleLazyLoad(entries) {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                this.#lazyLoadObserver.unobserve(entry.target);
                const container = entry.target;
                const playbackId = container.dataset.playbackId;
                const aspectRatio = container.dataset.aspectRatio || '16 / 9';
                const autoplay = container.dataset.autoplay === "true";

                const player = document.createElement('mux-player');
                player.playbackId = playbackId;
                player.streamType = 'on-demand';
                player.style.aspectRatio = aspectRatio;
                player.thumbnailTime = 0;
                if (this.#noLowRes) {
                    const cssWidth = container.getBoundingClientRect().width
                        || container.parentElement?.getBoundingClientRect().width;
                    const physicalWidth = cssWidth * window.devicePixelRatio;
                    // aspectRatio funktioniert mit Zahl und mit Verhältnis (x/y)
                    const arRatio = aspectRatio.includes('/')
                        ? (([w, h]) => parseFloat(w) / parseFloat(h))(aspectRatio.split('/'))
                        : parseFloat(aspectRatio);
                    const physicalHeight = physicalWidth / arRatio;
                    const tiers = [
                        [270, '270p'], [360, '360p'], [480, '480p'], [540, '540p'],
                        [720, '720p'], [1080, '1080p'], [1440, '1440p'], [2160, '2160p'],
                    ];
                    player.minResolution = (tiers.find(([px]) => physicalHeight <= px) ?? [, '2160p'])[1];
                }

                if (container.dataset.accentColor) {
                    player.accentColor = container.dataset.accentColor;
                }

                if (container.dataset.poster === 'false') {
                    player.setAttribute('poster', '');
                } else if (container.dataset.poster) {
                    player.poster = container.dataset.poster;
                }

                if (autoplay) {
                    player.setAttribute('data-autoplay', 'true');
                } else {
                    player.setAttribute('data-autoplay', 'false');
                }

                if (this.#disableTracking) {
                    player.setAttribute('disable-tracking', '');
                } else if (this.#envKey) {
                    player.setAttribute('env-key', this.#envKey);
                    if (this.#metadata) {
                        player.metadata = this.#metadata;
                    }
                }

                const setStatus = value => player.setAttribute('data-status', value);

                player.addEventListener('loadstart', () => setStatus('loadstart'));
                player.addEventListener('playing', () => setStatus('playing'));
                player.addEventListener('pause', () => setStatus('pause'));
                player.addEventListener('ended', () => setStatus('ended'));

                console.log(
                    'Toolkit Video',
                    'width:', container.getBoundingClientRect().width, 
                    'height:', container.getBoundingClientRect().height,
                    'aspectRatio:', aspectRatio
                );

                container.replaceWith(player);
                setStatus('false');

                this.handleVisibilityChange(player);
                if (this.#onPlayerCreated) {
                    this.#onPlayerCreated(player, container);
                }
            }
        }
    }

    // Für autoplay Videos: play und pause
    #handlePlayPause(entries) {
        for (const entry of entries) {
            const player = entry.target;
            if (entry.isIntersecting) {
                player.play().catch(e => console.error("Player-Fehler:", e));
            } else {
                player.pause();
            }
        }
    }
}
