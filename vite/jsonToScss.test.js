import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsonToScss } from './jsonToScss.js';

test('colors: jede CSS-Farbschreibweise ohne Quotes', () => {
    const scss = jsonToScss({
        colors: {
            background: 'white',
            accent: 'oklch(70% 0.1 250)',
            text: '#1a1a1a',
            button: { fill: 'black' },
        },
    });
    assert.equal(
        scss,
        '$colors: ("background": white, "accent": oklch(70% 0.1 250), "text": #1a1a1a, "button": ("fill": black));',
    );
});

test('ausserhalb von colors: Strings in Quotes, Hex ohne', () => {
    const scss = jsonToScss({
        vwBasis: 'desktop',
        farben: { rot: '#ff0000', name: 'white' },
    });
    assert.equal(scss, '$vwBasis: "desktop";\n$farben: ("rot": #ff0000, "name": "white");');
});
