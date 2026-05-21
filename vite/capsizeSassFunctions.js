import { fromFile } from '@capsizecss/unpack';
import { createStyleObject, getCapHeight } from '@capsizecss/core';
import * as sass from 'sass';
import { OrderedMap } from 'immutable';
import path from 'path';

/**
 * Erzeugt ein Sass-functions-Objekt, das die Custom-Function
 * `capsize-pseudo-elements($name, $fontSize, $lineHeight)` bereitstellt.
 *
 * Die Funktion ruft intern @capsizecss/core.createStyleObject auf und gibt
 * eine Sass-Map mit allen Pseudo-Element-Stilen zurück. Beispiel-Struktur:
 *
 *     (
 *       '::before': (content: '', margin-bottom: -0.123em, display: table),
 *       '::after':  (content: '', margin-top: -0.456em, display: table),
 *     )
 *
 * SCSS iteriert die Map und emittiert die Pseudo-Element-Regeln. Damit
 * kommt das CSS-Schema (welche Properties, welche Pseudo-Elemente) komplett
 * aus Capsize — Updates fliessen direkt durch.
 *
 * @param {Object<string,string>} fontFiles - Map: Font-Name → Pfad zur Font-Datei
 * @returns {Promise<Object>} - functions-Objekt für preprocessorOptions.scss.functions
 */
export async function createCapsizeFunctions(fontFiles) {
    const metrics = {};
    for (const [name, file] of Object.entries(fontFiles)) {
        metrics[name] = await fromFile(path.resolve(file));
    }

    return {
        'capsize-pseudo-elements($name, $fontSize, $lineHeight)': (args) => {
            const name = args[0].assertString('name').text;
            const fontSize = args[1].assertNumber('fontSize').value;
            const lineHeight = args[2].assertNumber('lineHeight').value;

            const fontMetrics = metrics[name];
            if (!fontMetrics) {
                throw new Error(
                    `capsize-pseudo-elements: Keine Metriken für Font "${name}" geladen. ` +
                    `Verfügbar: ${Object.keys(metrics).join(', ') || '(keine)'}.`
                );
            }

            // createStyleObject liefert font-size, line-height, ::before, ::after.
            // Wir nehmen nur die Pseudo-Elemente — font-size/line-height
            // werden im SCSS via size() aus vwBody erzeugt.
            const styles = createStyleObject({ fontSize, leading: lineHeight, fontMetrics });

            const entries = [];
            for (const [key, val] of Object.entries(styles)) {
                if (key.startsWith('::')) {
                    entries.push([
                        new sass.SassString(key, { quotes: false }),
                        _objToSassMap(val),
                    ]);
                }
            }
            return new sass.SassMap(OrderedMap(entries));
        },

        'capsize-cap-height($name, $fontSize)': (args) => {
            const name = args[0].assertString('name').text;
            const fontSize = args[1].assertNumber('fontSize').value;

            const fontMetrics = metrics[name];
            if (!fontMetrics) {
                throw new Error(
                    `capsize-cap-height: Keine Metriken für Font "${name}" geladen. ` +
                    `Verfügbar: ${Object.keys(metrics).join(', ') || '(keine)'}.`
                );
            }

            const capHeight = getCapHeight({ fontSize, fontMetrics });
            return new sass.SassNumber(capHeight);
        }
    };
}

// camelCase → kebab-case
function _toKebab(s) {
    return s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

// JS-Wert (number | string) → Sass-Wert (SassNumber | SassString)
function _jsValueToSass(value) {
    if (typeof value === 'number') {
        return new sass.SassNumber(value);
    }
    if (typeof value === 'string') {
        const m = value.match(/^(-?\d*\.?\d+)([a-z%]+)$/);
        if (m) {
            return new sass.SassNumber(parseFloat(m[1]), m[2]);
        }
        return new sass.SassString(value, { quotes: false });
    }
    throw new Error(`capsize-pseudo-elements: unerwarteter Wert-Typ ${typeof value}`);
}

// JS-Objekt {camelCaseKey: value} → Sass-Map (kebab-case-key, SassValue)
function _objToSassMap(obj) {
    const entries = Object.entries(obj).map(([key, val]) => [
        new sass.SassString(_toKebab(key), { quotes: false }),
        _jsValueToSass(val),
    ]);
    return new sass.SassMap(OrderedMap(entries));
}
