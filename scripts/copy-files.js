import fs from 'fs-extra';
import { glob } from 'glob';
import path from 'path';
import chokidar from 'chokidar';
import { syncConventions } from './sync-conventions.js';

/**
 * @typedef {Object} CopyTask
 * @property {string} name - Anzeigename des Tasks (für Logs).
 * @property {string} src  - Glob-Pattern der Quelldateien.
 * @property {string} dest - Zielverzeichnis.
 * @property {string} base - Basis-Pfad; relative Pfade werden ausgehend davon erhalten.
 */

async function runTask(task) {
    const files = await glob(task.src, { nodir: true, dot: true });
    if (files.length === 0) return;

    for (const file of files) {
        const relativePath = path.relative(task.base, file);
        const destPath = path.join(task.dest, relativePath);
        await fs.copy(file, destPath);
    }
}

/**
 * Leert alle Ziel-Verzeichnisse und kopiert anschliessend alle Quelldateien
 * jedes Tasks parallel ins jeweilige Ziel.
 * @param {CopyTask[]} copyTasks
 */
export async function copyAll(copyTasks) {
    console.log('🚀 Starting initial copy of all files...');
    // empty folders to prevent orphaned files
    for (const task of copyTasks) {
        await fs.emptyDir(task.dest);
    }
    // run tasks parallely
    await Promise.all(copyTasks.map(task => runTask(task)));
    console.log('✅ Initial copy complete.');
}

/**
 * Beobachtet `watchDir` und führt bei jeder Änderung `copyAll` aus.
 * @param {CopyTask[]} copyTasks
 * @param {string} [watchDir='src']
 */
export function watchFiles(copyTasks, watchDir = 'src') {
    console.log(`👀 Watching for file changes in ${watchDir}/`);

    // set lock variable to prevent parallel copy tasks
    let isCopying = false;

    const watcher = chokidar.watch(watchDir, { ignored: /(^|[\/\\])\../, persistent: true });

    watcher.on('all', async (event, filePath) => {
        if (['add', 'change', 'unlink'].includes(event)) {

            // only proceed if copy job is not running
            if (isCopying) {
                return;
            }

            console.log(`[${event}] ${filePath}. Re-copying all files...`);

            // secure copy job with try...finally
            try {
                isCopying = true; // activate lock
                await copyAll(copyTasks);
            } catch (err) {
                console.error("Error during copy:", err);
            } finally {
                isCopying = false; // deactivate lock, allow new copy job
            }
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
