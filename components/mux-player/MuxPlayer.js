import '@mux/mux-player';
import './mux-player.scss';

export class MuxPlayer {
    #lazyLoadObserver;
    #playPauseObserver;
    #loop;
    #resolution;
    #onPlayerCreated;

    constructor({ loop = false, resolution = '1080p', onPlayerCreated = null } = {}) {
        this.#loop = loop;
        this.#resolution = resolution;
        this.#onPlayerCreated = onPlayerCreated;
        this.#lazyLoadObserver = new IntersectionObserver(this.#handleLazyLoad.bind(this));
        this.#playPauseObserver = new IntersectionObserver(this.#handlePlayPause.bind(this));
    }

    observeLazyElements() {
        document.querySelectorAll('.mux-player').forEach(el => {
            this.#lazyLoadObserver.observe(el);
        });
    }

    #setupAutoplay(player) {
        // Guard Clause: Führe das Setup nur aus, wenn es noch nicht passiert ist.
        if (player.dataset.isSetup === 'true') {
            return;
        }

        player.muted = true;
        player.style.setProperty('--controls', 'none');
        if (this.#loop) player.loop = true;

        // Flag setzen, um zukünftige Ausführungen zu verhindern.
        player.dataset.isSetup = 'true';

        // Den playPauseObserver starten, sobald die Daten geladen sind.
        if (player.readyState >= 2) { // HAVE_CURRENT_DATA oder höher
            this.#playPauseObserver.observe(player);
        } else {
            player.addEventListener('loadeddata', () => {
                this.#playPauseObserver.observe(player);
            }, { once: true });
        }
    }

    handleVisibilityChange(player) {
        const isVisible = window.getComputedStyle(player).display !== 'none';

        if (isVisible && player.hasAttribute('data-autoplay') && player.dataset.isSetup !== 'true') {
            this.#setupAutoplay(player);
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
                player.playsInline = true;
                player.style.aspectRatio = aspectRatio;
                player.thumbnailTime = 0;
                player.minResolution = this.#resolution;

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
                }

                player.setAttribute('data-playing', 'false');

                player.addEventListener('playing', () => {
                    player.setAttribute('data-playing', 'true');
                });
                player.addEventListener('pause', () => {
                    player.setAttribute('data-playing', 'pause');
                });
                player.addEventListener('ended', () => {
                    player.setAttribute('data-playing', 'ended');
                });

                container.replaceWith(player);

                if (this.#onPlayerCreated) {
                    this.#onPlayerCreated(player, container);
                } else if (autoplay) {
                    this.handleVisibilityChange(player);
                }
            }
        }
    }

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
