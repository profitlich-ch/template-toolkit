/**
 * Wandelt ein JSON-Objekt in SCSS-Variablen-Deklarationen um.
 * Top-Level-Keys werden zu `$key: value;`-Zeilen, verschachtelte Objekte zu
 * Sass-Maps `(key: value, ...)`. Hex-Farben werden ohne Quotes ausgegeben.
 * Der Key `README` wird übersprungen.
 *
 * @param {Object} json - Quell-Objekt (z.B. Inhalt von `src/config.json`).
 * @returns {string} SCSS-Source mit einer `$variable: ...;`-Zeile pro Top-Level-Key.
 */
export function jsonToScss(json) {
    const toValue = (v) => {
        if (typeof v === 'object' && v !== null) {
            return '(' + Object.entries(v).map(([k, val]) => `"${k}": ${toValue(val)}`).join(', ') + ')';
        }
        if (typeof v === 'string') {
            if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v; // Hex-Farben ohne Quotes
            return `"${v}"`;
        }
        return v;
    };
    return Object.entries(json)
        .filter(([key]) => key !== 'README')
        .map(([key, value]) => `$${key}: ${toValue(value)};`)
        .join('\n');
}
