import fs from 'fs-extra';
import { glob } from 'glob';
import path from 'path';
import chokidar from 'chokidar';
import { syncConventions } from './sync-conventions.js';
import { coalesce } from './coalesce.js';

/**
 * @typedef {Object} CopyTask
 * @property {string} name - Anzeigename des Tasks (für Logs).
 * @property {string} src  - Glob-Pattern der Quelldateien.
 * @property {string} dest - Zielverzeichnis.
 * @property {string} base - Basis-Pfad; relative Pfade werden ausgehend davon erhalten.
 */

/** Liefert je Quelldatei des Tasks das absolute Paar aus Quelle und Ziel. */
async function taskFiles(task) {
    const patterns = [task.src].flat();
    // glob ab Version 9 kennt keine Negation im Muster; ein `!…` schlösse sonst nichts aus.
    const include = patterns.filter(p => !p.startsWith('!'));
    const ignore = patterns.filter(p => p.startsWith('!')).map(p => p.slice(1));
    const files = await glob(include, { nodir: true, dot: true, ignore });
    return files.map(file => ({
        src: path.resolve(file),
        dest: path.resolve(task.dest, path.relative(task.base, file)),
    }));
}

async function isCurrent(src, dest) {
    try {
        const [s, d] = await Promise.all([fs.stat(src), fs.stat(dest)]);
        return s.size === d.size && s.mtimeMs <= d.mtimeMs;
    } catch {
        return false;
    }
}

async function copyFile(src, dest) {
    if (await isCurrent(src, dest)) return;
    // Über eine Zwischendatei, damit eine gleichzeitige Anfrage nie eine halb geschriebene Datei liest.
    const tmp = path.join(path.dirname(dest), `.${path.basename(dest)}.${process.pid}.tmp`);
    try {
        await fs.copy(src, tmp);
    } catch (err) {
        // Seit glob gelöscht: Das Ereignis dazu hat den nächsten Durchgang schon vorgemerkt.
        if (err.code === 'ENOENT' && !(await fs.pathExists(src))) return;
        throw err;
    }
    await fs.rename(tmp, dest);
}

/** Entfernt unter `dir` jede Datei ausserhalb von `keep` und leere Ordner ausser den Zielen selbst. */
async function prune(dir, keep, roots) {
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const entry of entries) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await prune(p, keep, roots);
            if (!roots.has(p) && (await fs.readdir(p)).length === 0) await fs.rmdir(p);
        } else if (!keep.has(p)) {
            await fs.remove(p);
        }
    }
}

/**
 * Bringt alle Ziel-Verzeichnisse auf den Stand der Quellen: kopiert neue und
 * geänderte Dateien und entfernt danach, was keine Quelle mehr hat. Die Ziele
 * werden nie geleert; zu keinem Zeitpunkt fehlt eine Datei, die eine Quelle hat.
 *
 * Verwaist ist eine Datei erst, wenn sie zu keinem Task gehört. So bleiben
 * ineinanderliegende Ziele (`templates` und `templates/_macros`) und Ziele,
 * die mehrere Tasks gemeinsam füllen, erhalten.
 * @param {CopyTask[]} copyTasks
 */
export async function copyAll(copyTasks) {
    const pairs = new Map();
    for (const task of copyTasks) {
        for (const { src, dest } of await taskFiles(task)) pairs.set(dest, src);
    }
    const roots = new Set(copyTasks.map(task => path.resolve(task.dest)));
    for (const root of roots) await fs.ensureDir(root);

    await Promise.all([...pairs].map(([dest, src]) => copyFile(src, dest)));
    for (const root of roots) await prune(root, pairs, roots);
    console.log(`✅ ${pairs.size} files in sync.`);
}

/**
 * Beobachtet `watchDir` und führt nach Änderungen `copyAll` aus. Änderungen
 * kurz nacheinander ergeben einen Durchgang; was während eines Durchgangs
 * geändert wird, holt ein weiterer Durchgang direkt danach nach.
 * @param {CopyTask[]} copyTasks
 * @param {string} [watchDir='src']
 */
export function watchFiles(copyTasks, watchDir = 'src') {
    console.log(`👀 Watching for file changes in ${watchDir}/`);

    const trigger = coalesce(() => copyAll(copyTasks));
    const watcher = chokidar.watch(watchDir, { ignored: /(^|[\/\\])\../, persistent: true, ignoreInitial: true });

    watcher.on('all', (event, filePath) => {
        if (['add', 'change', 'unlink', 'unlinkDir'].includes(event)) {
            console.log(`[${event}] ${filePath}`);
            trigger();
        }
    });
}

/**
 * Run the copy-files script.
 * Liest `process.argv[2]`: `dev` startet einmal `copyAll` und danach `watchFiles`,
 * `build` führt `copyAll` einmal aus.
 *
 * Übernimmt vorab die geerbten Konventionen in die `CLAUDE.md` des Projekts —
 * hier statt in jedem Projekt einzeln verdrahtet, damit bestehende Projekte
 * nichts anpassen müssen. Ohne Marken in der Zieldatei passiert nichts.
 * @param {CopyTask[]} copyTasks
 * @param {Object}   [options]
 * @param {string}   [options.watchDir='src'] - Im Dev-Mode beobachtetes Verzeichnis.
 * @param {string}   [options.template] - Sorte für den Konventionsblock, z.B. `craftcms`.
 * @param {boolean}  [options.syncConventions=true] - Konventionsblock schreiben.
 */
export function run(copyTasks, options = {}) {
    const command = process.argv[2];
    const watchDir = options.watchDir || 'src';

    const vorlauf = options.syncConventions === false
        ? Promise.resolve()
        : syncConventions({ template: options.template })
            .catch(err => console.error('Konventionen nicht übernommen:', err));

    if (command === 'dev') {
        vorlauf.then(() => copyAll(copyTasks)).then(() => watchFiles(copyTasks, watchDir));
    } else if (command === 'build') {
        vorlauf.then(() => copyAll(copyTasks));
    }
}
