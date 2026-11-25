/**
 * Fasst Auslöser zu Durchläufen von `job` zusammen: Auslöser innerhalb von
 * `delay` ms ergeben einen Durchlauf, und ein Auslöser während eines laufenden
 * Durchlaufs wird vorgemerkt und hängt genau einen weiteren an. Es läuft nie
 * mehr als ein Durchlauf gleichzeitig.
 *
 * @param {() => Promise<void>} job
 * @param {number} [delay=100] - Wartezeit in ms nach dem letzten Auslöser.
 * @returns {() => void} Auslöser.
 */
export function coalesce(job, delay = 100) {
    let timer = null;
    let running = false;
    let pending = false;

    const start = async () => {
        timer = null;
        if (running) {
            pending = true;
            return;
        }
        running = true;
        do {
            pending = false;
            try {
                await job();
            } catch (err) {
                console.error('Error during copy:', err);
            }
        } while (pending);
        running = false;
    };

    return () => {
        clearTimeout(timer);
        timer = setTimeout(start, delay);
    };
}
