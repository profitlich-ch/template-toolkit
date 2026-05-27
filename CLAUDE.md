# CLAUDE.md – Entwicklungskonventionen

Zwei Template-Projekte teilen sich `@profitlich/template-toolkit` als npm-Paket für SCSS, JS-Utilities und Build-Skripte. Dieses Repo: Craft CMS. Schwester-Repo: `template-kirbycms` mit Kirby. Toolkit lokal unter `~/Profitlich/F Lokal/template-toolkit`.

## Stack

- **ddev** – lokale Entwicklungsumgebung
- **npm immer über ddev** aufrufen: `ddev npm run dev`, `ddev npm install` etc.
- **Vite** – Build-Tool für JS und SCSS

## Git

- Dateien immer mit `git mv` umbenennen/verschieben, nie kopieren+löschen
- **Branches und Commits** werden ausschliesslich vom Entwickler erstellt, nie von Claude
- Commit-Messages auf Deutsch, kurz, beschreiben was geändert wurde (nicht warum)

## Toolkit vs. Projekt

Code gehört ins **Toolkit**, wenn er in mehr als einem Projekt verwendet wird oder werden könnte und keine projektspezifischen Pfade oder Inhalte enthält. Bei Toolkit-Änderungen: Version bumpen → publishen → hier in `package.json` updaten.

Code bleibt im **Projekt**, wenn er projektspezifische Pfade, CSS-Klassen oder CMS-Eigenheiten enthält.

## JavaScript

- **Klassen bevorzugen** mit private Fields per `#`-Prefix – nie Underscore-Konvention (`_field`)
- **Singleton-Pattern** für Utilities, die global einmalig sind (analog zu `MediaQueries`, `MenuToggle`)
- **Design Patterns:** Vor der Implementierung das passende Pattern vorschlagen und begründen – nicht immer ist Singleton richtig

## Custom Events und Data-Attributes

- Zustandskommunikation zwischen Komponenten über `CustomEvent`, nicht direkte Methodenaufrufe
- Event-Namenskonvention: `event` + PascalCase → `eventMenuStatus`, `eventBodyScrolled`
- DOM-Zustand per `data-*`-Attribut, nie als CSS-Klassen-Toggle: `document.body.setAttribute('data-menu-active', 'true')`

## SCSS

- Nie direkte `px`-, `vw`- oder `rem`-Werte – ausschliesslich Toolkit-Funktionen: `size()`, `columns()`, `font()`, `marginPadding()`
- `src/config.json` ist die einzige Quelle für Breakpoints, Layouts, Farben – nie im Code hardcodieren
- Jedes Modul/Snippet hat eine eigene `.js`-Datei, die das zugehörige SCSS importiert – auch wenn sie sonst keine Logik enthält
- Keine globalen Styles in Modul- oder Snippet-SCSS-Dateien

### vw-Basis

Per Default skalieren vw-basierte Werte mit der Viewport-Breite inkl. Scrollbar (`100vw`). Mit `"vwBasis": "body"` als Top-Level Feld in `src/config.json` skalieren sie stattdessen mit der scrollbar-freien Body-Breite — sinnvoll, wenn Layout-Elemente in `%` gesetzt sind und Schriften/Abstände exakt mit diesen mitskalieren sollen. Dafür im Projekt `VwBody.getInstance()` (aus `@profitlich/template-toolkit/utils/VwBody`) aufrufen — setzt die Custom Property `--vw-body` per JS. Default-Verhalten ohne Feld unverändert.

**Wichtig bei vwBasis "body"**: Werte aus `size()`, `columns()`, `marginPadding()` sind dann CSS-`calc()`-Ausdrücke. Sass kann sie ausserhalb eines `calc()`-Wrappers nicht arithmetisch kombinieren. Statt `($a - $b)` mit Sass-Parens → `calc($a - $b)`. Auch im Default-Modus ist diese Schreibweise unschädlich, also generell als Konvention nutzen.

### Capsize

Optionale pixel-präzise Schriftpositionierung via `@capsizecss/core` (Em-Trims an `::before`/`::after`). Capsize wird zur Sass-Compile-Zeit über eine Custom-Function direkt aufgerufen — keine Algorithmus-Reimplementierung, Updates aus dem Capsize-Paket fliessen mit.

Setup im Konsumenten:

1. `@capsizecss/unpack` und `@capsizecss/core` als devDependency installieren.
2. In `src/config.json` Top-Level-Feld `fonts` ergänzen: Map Name → Pfad zur Font-Datei.
3. In `vite.config.js`:

    ```js
    import { createCapsizeFunctions } from '@profitlich/template-toolkit/vite/capsizeSassFunctions';
    // defineConfig async:
    const capsizeFunctions = await createCapsizeFunctions(configJson.fonts ?? {});
    // dann: css.preprocessorOptions.scss.functions = capsizeFunctions;
    ```

4. Pro `@include font(...)` als 4. Argument den Font-Namen aus `fonts` mitgeben — Trims werden emittiert. Ohne Argument: kein Capsize-Output (Default).

`font-weight` wird nicht mehr vom `font()`-Mixin gesetzt — direkt im CSS deklarieren (meist breakpoint-übergreifend).

**SCSS-Organisation**: `scss/core/capsize.scss` enthält das `capsize`-Mixin (emittiert Pseudo-Elemente). `font()` in `layout.scss` ruft es intern auf, wenn das 4. Argument gesetzt ist. Du kannst das Mixin auch direkt nutzen, falls du Capsize ohne `font()` brauchst:

```scss
.foo { @include capsize("soehne", 40, 45); }
```

**Cap-Höhe als SCSS-Wert**: `capsize-cap-height($name, $fontSize)` liefert die Cap-Höhe als unitless Zahl (Design-Pixel). Nutzbar für eigene Berechnungen, z. B. paddings, die zum Grid passen sollen:

```scss
$cap: capsize-cap-height("soehne", 40);  // → font-spezifischer Wert
padding-top: size($layout, 40 - $cap + 8);
```

## Vite Entry

Einen neuen Entry in `rollupOptions.input` eintragen **nur wenn** das Script per Twig/PHP-Tag direkt eingebunden wird. Wird es von einem anderen Script importiert, braucht es keinen eigenen Entry.

## Bilder

Kein `lazysizes`. Ausschliesslich natives `loading="lazy"`.

## CSP Nonce (Craft CMS)

Beim `craft.vite.script()`-Aufruf immer den Nonce mitgeben:

```twig
{{ craft.vite.script("src/modules/module-name/Module.js", false, { 'nonce': csp('script-src') }) }}
```
