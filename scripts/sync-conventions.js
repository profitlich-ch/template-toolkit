import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const paketWurzel = fileURLToPath(new URL('../', import.meta.url));
const paketDatei = path.join(paketWurzel, 'package.json');

const markeStart = '<!-- toolkit:start';
const markeEnde = '<!-- toolkit:end -->';

/**
 * Schreibt die geerbten Konventionen in die `CLAUDE.md` des Projekts.
 *
 * Claude liest keine Dateien aus `node_modules`. Die Konventionen müssen also
 * im Repo liegen — kopiert statt verlinkt. Ersetzt wird ausschliesslich der
 * Bereich zwischen den Marken; alles davor und dahinter ist Projekteigentum
 * und bleibt unangetastet.
 *
 * Der Block hängt an der *installierten* Toolkit-Version, nicht am neuesten
 * Stand: Ein Projekt zieht Änderungen erst, wenn es die Version hebt und einmal
 * baut. Die Änderung erscheint dann als git-Diff in der Projektdatei — sichtbar
 * und überprüfbar, statt still.
 *
 * Fehlt die Zieldatei oder fehlen die Marken, passiert nichts. Das Skript legt
 * bewusst nichts an: Ein Projekt ohne Marken hat sich gegen den Block
 * entschieden, und diese Entscheidung zu überschreiben wäre schlimmer, als sie
 * zu ignorieren.
 *
 * Zwei Quellen: `CLAUDE.project.md` gilt für alle Projekte, `CLAUDE.<template>.md`
 * zusätzlich für die jeweilige Sorte. Getrennte Dateien, ein Transportweg — das
 * Paket ist an eine Version gebunden, ein lokal geklontes Template-Repo dagegen
 * kann veraltet sein, ohne dass es auffällt.
 *
 * @param {Object} [options]
 * @param {string} [options.target='CLAUDE.md'] - Zieldatei, relativ zum Projektverzeichnis.
 * @param {string} [options.template] - Sorte, z.B. `craftcms` oder `kirbycms`.
 * @returns {Promise<boolean>} `true`, wenn geschrieben wurde.
 */
export async function syncConventions(options = {}) {
    const zielPfad = path.resolve(options.target ?? 'CLAUDE.md');

    const quellDateien = [path.join(paketWurzel, 'CLAUDE.project.md')];
    if (options.template) {
        quellDateien.push(path.join(paketWurzel, `CLAUDE.${options.template}.md`));
    }

    const abschnitte = [];
    for (const datei of quellDateien) {
        // Ältere Toolkit-Versionen bringen die Dateien nicht mit; eine unbekannte
        // Sorte soll den Lauf nicht abbrechen, sondern nur nichts beitragen
        if (await fs.pathExists(datei)) {
            abschnitte.push((await fs.readFile(datei, 'utf-8')).trim());
        }
    }

    if (abschnitte.length === 0) return false;

    if (!await fs.pathExists(zielPfad)) {
        console.log(`ℹ️  ${path.basename(zielPfad)} nicht gefunden — Konventionen nicht übernommen.`);
        return false;
    }

    const ziel = await fs.readFile(zielPfad, 'utf-8');
    const start = ziel.indexOf(markeStart);
    const ende = start === -1 ? -1 : ziel.indexOf(markeEnde, start);

    if (start === -1 || ende === -1) {
        console.log(`ℹ️  Keine Toolkit-Marken in ${path.basename(zielPfad)} — Konventionen nicht übernommen.`);
        console.log(`   Einfügen, wo der Block stehen soll:  ${markeStart} -->  …  ${markeEnde}`);
        return false;
    }

    const { version } = await fs.readJson(paketDatei);
    const sorte = options.template ? ` + ${options.template}` : '';

    const block = `${markeStart} ${version}${sorte} — erzeugt aus @profitlich/template-toolkit, nicht von Hand ändern -->\n`
        + `${abschnitte.join('\n\n')}\n`
        + markeEnde;

    const neu = ziel.slice(0, start) + block + ziel.slice(ende + markeEnde.length);

    // Nur schreiben, wenn sich etwas ändert — sonst stünde nach jedem Build eine
    // veränderte Datei im git status, ohne dass sich der Inhalt unterscheidet
    if (neu === ziel) return false;

    await fs.writeFile(zielPfad, neu);
    console.log(`🔄 ${path.basename(zielPfad)}: Konventionen aus Toolkit ${version} übernommen.`);
    return true;
}
