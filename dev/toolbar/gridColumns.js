/**
 * Spaltenangaben für `canvas-grid-lines`, Rasterarten `columns` und `ribbons`.
 * @typedef {Object} GridColumnsOptions
 * @property {number|number[]} columns - Spaltenzahl bei festem Gutter, sonst das
 *   Tripel `[total, band, gap]` in Rastereinheiten.
 * @property {number|null} fixedGap - Gutter in CSS-Pixeln, oder `null`, wenn er
 *   mit dem Layout mitwächst.
 */

/**
 * Rechnet die Spaltenkonfiguration eines Layouts in die Angaben um, die
 * `canvas-grid-lines` für die Rasterarten `columns` und `ribbons` erwartet.
 *
 * Welche Form sie haben, entscheidet `units` — dieselbe Angabe, nach der
 * `size()` im SCSS rechnet:
 *
 * - `px`: Der Gutter ist bei jeder Fensterbreite gleich breit, die Spalten
 *   teilen sich den Rest. Das Raster bekommt die Spaltenzahl und den Gutter als
 *   festen Abstand.
 * - `vw`: Spalten und Gutter wachsen gemeinsam; ihr Verhältnis ist bei jeder
 *   Breite dasselbe und geht als Tripel `[total, band, gap]` ans Raster.
 *
 * @param {Object} config - Inhalt von `src/config.json` des Projekts.
 * @param {string} layout - Layoutname, etwa `desktop`.
 * @returns {GridColumnsOptions|undefined} `undefined`, wenn die Angaben fehlen
 *   oder kein brauchbares Raster ergeben.
 */
export function gridColumnsOptions(config, layout) {
    const width = config?.layouts?.[layout];
    const margins = config?.margins?.[layout];
    const gutter = config?.gutter?.[layout];
    const count = config?.columns?.[layout];

    if (width == null || margins == null || gutter == null || count == null) {
        console.warn(`Dev-Toolbar: Für das Layout "${layout}" fehlen Angaben in der config.json (layouts, margins, columns, gutter). Wird initDev die Config übergeben?`);
        return undefined;
    }

    if (config?.units?.[layout] === 'px') {
        if (!Number.isInteger(count) || count <= 0 || !Number.isFinite(gutter) || gutter < 0) {
            console.warn(`Dev-Toolbar: Layout "${layout}" ergibt keine brauchbare Spaltenaufteilung (Gutter ${gutter}, Spalten ${count}) — das Raster bleibt aus.`);
            return undefined;
        }
        return { columns: count, fixedGap: gutter };
    }

    // Die Spaltenbreite ist `zaehler / count` und oft kein ganzer Designpixel —
    // in `template-kirbycms` etwa 91,428…. Deshalb wird sie nie ausgerechnet:
    // Das Verhältnis Spalte zu Gutter ist `zaehler/count : gutter`, und mit
    // `count` erweitert wird daraus `zaehler : count · gutter`, also ein
    // Verhältnis zweier ganzer Zahlen. Gekürzt ergibt das exakt das gesuchte
    // Muster, ohne jede Rundung — der grösste gemeinsame Teiler macht aus
    // 80 : 20 die ganzen Zahlen 4 : 1, die das Paket als Wiederholungsmuster
    // braucht.
    const zaehler = width - margins.left - margins.right - (count - 1) * gutter;

    if (!Number.isInteger(zaehler) || !Number.isInteger(gutter) || !Number.isInteger(count) || zaehler <= 0) {
        console.warn(`Dev-Toolbar: Layout "${layout}" ergibt keine brauchbare Spaltenaufteilung (Rest ${zaehler}, Gutter ${gutter}, Spalten ${count}) — das Raster bleibt aus.`);
        return undefined;
    }

    const unit = greatestCommonDivisor(zaehler, count * gutter);
    const band = zaehler / unit;
    const gap = (count * gutter) / unit;

    return { columns: [count * band + (count - 1) * gap, band, gap], fixedGap: null };
}

function greatestCommonDivisor(a, b) {
    return b === 0 ? a : greatestCommonDivisor(b, a % b);
}
