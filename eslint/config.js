import js from '@eslint/js';
import globals from 'globals';

/**
 * Die ESLint-Grundkonfiguration aller Toolkit-Projekte (Flat Config).
 *
 * Das Projekt stellt seine eigene `ignores`-Liste voran – welche Ordner
 * erzeugt oder fremd sind, unterscheidet sich je CMS – und kann weitere
 * Blöcke anhängen:
 *
 * ```js
 * import { eslintConfig } from '@profitlich/template-toolkit/eslint/config';
 * export default [{ ignores: ['templates/**', 'web/**'] }, ...eslintConfig()];
 * ```
 *
 * @returns {import('eslint').Linter.Config[]}
 */
export function eslintConfig() {
    return [
        js.configs.recommended,

        {
            // Frontend: läuft im Browser
            files: ['src/**/*.js'],
            languageOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                globals: {
                    ...globals.browser,
                    // Von Vite per `define` zur Bauzeit ersetzt, siehe defineDebug in vite/config.js
                    __DEBUG__: 'readonly',
                },
            },
            rules: {
                // Zugewiesene Werte, die niemand liest. Ungenutzte Funktionsargumente
                // bleiben erlaubt, solange danach noch benutzte folgen – Event-Handler
                // mit (event, index) sind sonst nicht schreibbar.
                'no-unused-vars': ['error', { args: 'after-used' }],
                'no-unused-private-class-members': 'error',
            },
        },

        {
            // Build- und Deploy-Skripte: laufen in Node
            files: ['scripts/**/*.js', '*.config.js'],
            languageOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                globals: globals.node,
            },
        },
    ];
}
