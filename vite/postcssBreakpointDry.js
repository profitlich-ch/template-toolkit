import path from 'node:path';

/**
 * PostCSS-Plugin, das Wiederholungen über Breakpoint-Blöcke hinweg meldet.
 *
 * Läuft auf dem kompilierten CSS jeder SCSS-Datei. Verschachtelung ist dort
 * aufgelöst und `$layout`-Werte sind ausgerechnet. Gewarnt wird in zwei Fällen:
 *
 * - Eine Deklaration steht mit gleichem Selektor und gleichem Wert in
 *   Media-Queries, die zusammen alle Breiten abdecken (typisch: smartphone,
 *   tablet und desktop). Sie gehört in die Grundregel.
 * - Eine Deklaration in einer Media-Query wiederholt, was die Grundregel für
 *   denselben Selektor bereits setzt.
 *
 * Das Plugin warnt nur und bricht den Build nie ab. Dateien aus `node_modules`
 * werden übersprungen.
 *
 * @returns {import('postcss').Plugin}
 */
export default function postcssBreakpointDry() {
    return {
        postcssPlugin: 'postcss-breakpoint-dry',
        OnceExit(root, { result }) {
            const file = root.source?.input.file ?? '';
            if (/[\\/]node_modules[\\/]/.test(file)) return;
            // Vite nennt bei PostCSS-Warnungen die Datei nicht, darum steht sie in der Meldung
            const location = file ? `${path.relative(process.cwd(), file)}: ` : '';

            // Selektor|Eigenschaft → Wert, jeweils der letzte Stand der Grundregeln
            const base = new Map();
            // Selektor|Eigenschaft → [{ value, interval, decl, baseValue }]
            const media = new Map();

            root.each((node) => {
                if (node.type === 'rule') {
                    eachDecl(node, (key, value) => base.set(key, value));
                    return;
                }
                if (node.type !== 'atrule' || node.name !== 'media') return;

                // Unbekannte Bedingungen wie (hover: hover) lassen sich nicht auf Breiten abbilden
                const interval = parseInterval(node.params);
                if (!interval) return;

                node.each((rule) => {
                    if (rule.type !== 'rule') return;
                    eachDecl(rule, (key, value, decl) => {
                        if (!media.has(key)) media.set(key, []);
                        media.get(key).push({ value, interval, decl, baseValue: base.get(key) });
                    });
                });
            });

            // Selektoren, bei denen mindestens eine Eigenschaft je Media-Query anders ausfällt
            const varying = new Set();
            for (const [key, entries] of media) {
                if (new Set(entries.map((entry) => entry.value)).size > 1) varying.add(key.split('|')[0]);
            }

            for (const [key, entries] of media) {
                // Setzt eine andere Media-Query denselben Selektor anders, hängt das
                // Ergebnis an der Reihenfolge – kein eindeutiger Fall
                const values = new Set(entries.map((entry) => entry.value));
                if (values.size > 1) continue;

                const [selector, prop] = key.split('|');
                const { value, decl } = entries[0];
                const pseudo = /::?(before|after)\b/.test(selector);

                // Capsize mit verschiedenem Verhältnis Zeilenhöhe/Schriftgrösse: Die Trims
                // unterscheiden sich pro Breakpoint, content und display nicht. Das
                // Pseudo-Element lässt sich nur als Ganzes verschieben, die Meldung wäre
                // im Modul nicht behebbar.
                if (pseudo && (prop === 'content' || prop === 'display') && varying.has(selector)) continue;

                // Pseudo-Elemente stammen meist aus font() mit Capsize-Font, behoben wird dort
                const hint = pseudo ? ' (bei Capsize: capsize() in die Grundregel)' : '';

                if (entries.every((entry) => entry.baseValue === value)) {
                    decl.warn(result, `${location}${selector} { ${prop}: ${value} } wiederholt die Grundregel und kann aus den Media-Queries entfallen${hint}`);
                } else if (coversAllWidths(entries.map((entry) => entry.interval))) {
                    decl.warn(result, `${location}${selector} { ${prop}: ${value} } steht in Media-Queries, die zusammen alle Breiten abdecken, und gehört in die Grundregel${hint}`);
                }
            }
        },
    };
}

postcssBreakpointDry.postcss = true;

/** Ruft `callback` für jede direkte Deklaration einer Regel auf, mit normalisiertem Schlüssel und Wert. */
function eachDecl(rule, callback) {
    const selector = rule.selectors.map((part) => part.replace(/\s+/g, ' ').trim()).join(', ');
    rule.each((decl) => {
        if (decl.type !== 'decl') return;
        const value = decl.value.replace(/\s+/g, ' ').trim() + (decl.important ? ' !important' : '');
        callback(`${selector}|${decl.prop}`, value, decl);
    });
}

/**
 * Liest eine Media-Query als Breitenbereich in ganzen px, in der Form
 * `(min-width: 740px)` oder `(width >= 740px)`. Liefert `null` für alles andere –
 * etwa Listen, Medientypen oder weitere Merkmale wie `(hover: hover)`.
 */
function parseInterval(params) {
    if (params.includes(',')) return null;

    const interval = { min: 0, max: Infinity };
    for (const condition of params.split(/\s+and\s+/i)) {
        const bound = parseBound(condition.trim());
        if (!bound) return null;
        if (bound.min !== undefined) interval.min = Math.max(interval.min, bound.min);
        if (bound.max !== undefined) interval.max = Math.min(interval.max, bound.max);
    }
    return interval;
}

function parseBound(condition) {
    const legacy = condition.match(/^\(\s*(min|max)-width\s*:\s*(\d+)px\s*\)$/i);
    if (legacy) {
        const px = Number(legacy[2]);
        return legacy[1].toLowerCase() === 'min' ? { min: px } : { max: px };
    }

    const range = condition.match(/^\(\s*width\s*(<=|>=|<|>)\s*(\d+)px\s*\)$/i);
    if (range) {
        const px = Number(range[2]);
        switch (range[1]) {
            case '>=': return { min: px };
            case '>': return { min: px + 1 };
            case '<=': return { max: px };
            case '<': return { max: px - 1 };
        }
    }
    return null;
}

/** Prüft, ob die Bereiche lückenlos von 0 bis unendlich reichen. */
function coversAllWidths(intervals) {
    let reached = 0;
    for (const { min, max } of [...intervals].sort((a, b) => a.min - b.min)) {
        // max-width: 739px und min-width: 740px schliessen lückenlos aneinander an
        if (min > reached) return false;
        reached = Math.max(reached, max + 1);
    }
    return reached === Infinity;
}
