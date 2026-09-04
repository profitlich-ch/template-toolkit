/**
 * Rechnet die Spaltenkonfiguration eines Layouts in das Tripel um, das
 * `canvas-grid-lines` für die Rasterarten `columns` und `ribbons` erwartet:
 * `[total, band, gap]` in Rastereinheiten.
 *
 * Die Einheit ist der grösste gemeinsame Teiler von Spaltenbreite und Gutter —
 * aus einem Verhältnis wie 80 : 20 werden damit die ganzen Zahlen 4 : 1, die
 * das Paket als Wiederholungsmuster braucht. Beide Rasterarten teilen sich
 * dieselbe Kantenfolge: `columns` strichelt sie, `ribbons` füllt dazwischen.
 *
 * @param {Object} config - Inhalt von `src/config.json` des Projekts.
 * @param {string} layout - Layoutname, etwa `desktop`.
 * @returns {number[]|undefined} `[total, band, gap]`, oder `undefined`, wenn die
 *   Angaben fehlen oder sich das Verhältnis nicht ganzzahlig ausdrücken lässt.
 */
export function gridColumnsTriple(config, layout) {
    const width = config?.layouts?.[layout];
    const margins = config?.margins?.[layout];
    const gutter = config?.gutter?.[layout];
    const count = config?.columns?.[layout];

    if (width == null || margins == null || gutter == null || count == null) {
        console.warn(`Dev-Toolbar: Für das Layout "${layout}" fehlen Angaben in der config.json (layouts, margins, columns, gutter). Wird initDev die Config übergeben?`);
        return undefined;
    }

    // Die Spaltenbreite ist `zaehler / count` und oft kein ganzer Designpixel —
    // in `template-kirbycms` etwa 91,428…. Deshalb wird sie nie ausgerechnet:
    // Das Verhältnis Spalte zu Gutter ist `zaehler/count : gutter`, und mit
    // `count` erweitert wird daraus `zaehler : count · gutter`, also ein
    // Verhältnis zweier ganzer Zahlen. Gekürzt ergibt das exakt das gesuchte
    // Muster, ohne jede Rundung.
    const zaehler = width - margins.left - margins.right - (count - 1) * gutter;

    if (!Number.isInteger(zaehler) || !Number.isInteger(gutter) || !Number.isInteger(count) || zaehler <= 0) {
        console.warn(`Dev-Toolbar: Layout "${layout}" ergibt keine brauchbare Spaltenaufteilung (Rest ${zaehler}, Gutter ${gutter}, Spalten ${count}) — das Raster bleibt aus.`);
        return undefined;
    }

    const unit = greatestCommonDivisor(zaehler, count * gutter);
    const band = zaehler / unit;
    const gap = (count * gutter) / unit;

    return [count * band + (count - 1) * gap, band, gap];
}

function greatestCommonDivisor(a, b) {
    return b === 0 ? a : greatestCommonDivisor(b, a % b);
}
