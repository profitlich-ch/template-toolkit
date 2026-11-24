/**
 * Wandelt ein JSON-Objekt in SCSS-Variablen-Deklarationen um.
 * Top-Level-Keys werden zu `$key: value;`-Zeilen, verschachtelte Objekte zu
 * Sass-Maps `(key: value, ...)`. Ohne Quotes ausgegeben werden alle Strings
 * unterhalb von `colors`, damit dort jede CSS-Farbschreibweise gilt, und
 * Hex-Farben überall; alle übrigen Strings in Quotes. Der Key `README` wird
 * übersprungen.
 *
 * @param {Object} json - Quell-Objekt (z.B. Inhalt von `src/config.json`).
 * @returns {string} SCSS-Source mit einer `$variable: ...;`-Zeile pro Top-Level-Key.
 */
export function jsonToScss(json) {
    const toValue = (v, unquoted) => {
        if (typeof v === 'object' && v !== null) {
            return '(' + Object.entries(v).map(([k, val]) => `"${k}": ${toValue(val, unquoted)}`).join(', ') + ')';
        }
        if (typeof v === 'string') {
            // Ein Farbwert als Sass-String landet mit Quotes im CSS (`background-color:"white"`),
            // und der Browser verwirft die Deklaration ohne Meldung. Hex bleibt auch ausserhalb
            // von `colors` ohne Quotes: Projekte führen Farben auch unter `farben` oder `color`.
            if (unquoted || /^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
            return `"${v}"`;
        }
        return v;
    };
    return Object.entries(json)
        .filter(([key]) => key !== 'README')
        .map(([key, value]) => `$${key}: ${toValue(value, key === 'colors')};`)
        .join('\n');
}
