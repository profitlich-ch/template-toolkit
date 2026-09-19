## Geerbte Konventionen

Dieser Abschnitt stammt aus `@profitlich/template-toolkit` und wird bei jedem `copy`-Lauf aus der installierten Paketversion neu geschrieben. Änderungen hier gehen verloren.

**Rangfolge:** Was **unterhalb** dieses Blocks steht, ist projektspezifisch und geht im Konfliktfall vor. Eine Abweichung ist erlaubt — sie soll nur als Abweichung sichtbar sein und nicht die geerbte Regel stillschweigend ersetzen.

**Wohin gehört eine neue Regel?** Betrifft sie den Stack (ddev, Vite, SCSS-Funktionen, Build, Deployment), gehört sie ins Toolkit und wird mit dessen nächstem Release verteilt. Betrifft sie nur eine CMS-Sorte, gehört sie in deren Datei im Toolkit. Betrifft sie nur dieses Projekt, gehört sie unter diesen Block.

### Stack

- **ddev** — lokale Entwicklungsumgebung.
- **npm immer über ddev** aufrufen: `ddev npm run dev`, `ddev npm install`, `ddev npm run release:staging`. Nie auf dem Host: Der Container legt die Node-Version über `nodejs_version` in `.ddev/config.yaml` fest, damit lokal dasselbe gebaut wird wie auf dem Server. Dass ein Build auf dem Host durchläuft, heisst nicht, dass er dort hingehört.
- **Bricht ein Build mit `Killed` ab, ohne Fehlermeldung**, ist der Speicher der Colima-VM ausgegangen und nicht der Code kaputt: Die VM hat keinen Swap, der Linux-OOM-Killer schickt sofort `SIGKILL`. Prüfen mit `ddev exec free -m`; Abhilfe ist `colima stop && colima start --memory 8` oder das Schliessen speicherhungriger Programme — nicht das Ausweichen auf den Host.
- **Vite** — Build-Tool für JS und SCSS.

### JavaScript

- **Klassen bevorzugen** mit private Fields per `#`-Prefix — nie Underscore-Konvention (`_field`).
- **Singleton-Pattern** für Utilities, die global einmalig sind (analog zu `MediaQueries`, `MenuToggle`).

### Custom Events und Data-Attributes

- Zustandskommunikation zwischen Komponenten über `CustomEvent`, nicht direkte Methodenaufrufe.
- Event-Namenskonvention: `event` + PascalCase → `eventMenuStatus`, `eventBodyScrolled`.
- DOM-**Zustand** per `data-*`-Attribut, nie als CSS-Klassen-Toggle: `document.body.setAttribute('data-menu-active', 'true')`.

Das betrifft den Zustand eines Elements. Wie ein Skript seine Elemente überhaupt **findet**, regelt der nächste Abschnitt.

### Wie JavaScript seine Elemente findet

Zwei Fragen, die leicht durcheinandergeraten:

*Welches Skript lädt diese Seite?* → immer `craft.vite.register` im Template, das das Markup rendert. Gilt unabhängig von allem Folgenden.

*Woran erkennt das Skript seine Elemente?* → dafür gilt:

> **Wer entscheidet, dort steht es.** Entscheidet der Code, steht der Selektor im Code. Entscheidet der Inhalt, steht es im Markup.

**Klassen-Selektor**, wenn das Verhalten untrennbar zur Komponente gehört — jedes Element dieser Klasse verhält sich immer so, es gibt nichts zu entscheiden:

```js
new Subcategory('.subcategory');
new HoverImages('.client-list__link');
```

**`data`-Attribut**, sobald eine der beiden Bedingungen zutrifft:

1. **Die Redaktion entscheidet, ob.** Ein CMS-Feld schaltet das Verhalten — `module.fixiert` → `data-sticky`, `module.raster` → `data-grid-type`. Der Code kann das nicht wissen.
2. **Das Element trägt einen Wert**, den das Skript braucht — `data-hover-image`, `data-categories`, `data-map-zoom`.

Fallen beide zusammen, ist der Selektor das Attribut:

```js
new Grid('[data-grid-type]');
```

Nicht überall Attribute: Ein `data-swiper="true"` an jeder `.subcategory` wäre eine zweite Stelle zum Ändern und suggeriert eine Wahlmöglichkeit, die es nicht gibt. Nicht überall Selektoren: Redaktionelle Entscheidungen und Werte pro Element kann der Code nicht kennen.

### Entry oder Klassendatei

Eine JS-Datei ist das eine oder das andere, nie beides:

- **Entry** — initialisiert sich selbst auf `DOMContentLoaded` und wird von keinem Modul importiert. Geladen durch `craft.vite.register`.
- **Klassendatei** — wird importiert und tut nichts, bis jemand sie konstruiert.

Vermischt man beides, wird ein Import zur versteckten Ladeanweisung: Er sieht ungenutzt aus, ist aber das Einzige, was die Funktion startet. Wer ihn entfernt — oder ein Linter, der ihn meldet — legt sie lautlos still.

### Debug-Code

Debug-Code bleibt im Quelltext — man braucht ihn beim nächsten Mal wieder. Er darf nur die **Produktion** nicht erreichen; auf Dev **und Staging** bleibt er vollständig erhalten.

Dafür zwei Hebel, je nach Fall:

- **`console.*`** — entfernt Terser beim Produktions-Build über `drop_console: mode === 'production'` in der `vite.config.js`. Kein Zutun nötig.
- **Alles andere** (Debug-Ausgaben ins DOM, Messungen, Overlays) — in `if (__DEBUG__) { … }` einschliessen. Vite ersetzt die Konstante zur Bauzeit per `define: { __DEBUG__: mode !== 'production' }`; daraus wird `if (false)`, und der Minifier wirft den Zweig weg.

An `mode` hängen, **nicht** an `import.meta.env.DEV` — Letzteres ist auf Staging bereits `false` und würde den Debug-Code dort verschlucken.

**Debug-Funktionen auf Modulebene schreiben, nicht als private Klassenmethoden.** Der Minifier entfernt zwar in beiden Fällen den Aufruf, schüttelt ungenutzte private Klassenmethoden aber nicht ab — deren Rumpf bliebe im Produktions-Bundle liegen. Als Funktion verschwindet er vollständig.

Ganze Dateien, die nur der Entwicklung dienen, werden gar nicht erst geladen: `{% if craft.app.env != 'production' %}` um die Registrierung, wie bei `Dev.js`.

**Debug-Anzeigen schaltbar machen** — nicht dauerhaft einblenden. Die Dev-Toolbar nimmt dafür projekteigene Checkboxen entgegen:

```js
// src/Dev.js
initDev(config, {
    toggles: [{ key: 'navigateSpace', name: 'Navigate Space' }],
});
```

Der Wert steht danach als `body[data-dev-navigate-space="true"]` bereit — für reine CSS-Anzeigen genügt das, weiteres JS braucht es nicht. Module, die auf den Wechsel *reagieren* müssen statt ihn nur darzustellen, hören auf `eventDevToggle` und lesen `event.detail.key` und `event.detail.value`.

Der Schalter ersetzt nicht `__DEBUG__`, er ergänzt es: `__DEBUG__` entscheidet, ob der Code überhaupt ausgeliefert wird, der Schalter, ob man ihn gerade sehen will.

Ist ESLint eingerichtet, braucht `__DEBUG__` einen Eintrag unter `languageOptions.globals`, sonst meldet `no-undef`.

### SCSS

- Nie direkte `px`-, `vw`- oder `rem`-Werte — ausschliesslich Toolkit-Funktionen: `size()`, `columns()`, `font()`, `marginPadding()`.
- `src/config.json` ist die einzige Quelle für Breakpoints, Layouts, Farben — nie im Code hardcodieren.
- Jedes Modul/Snippet hat eine eigene `.js`-Datei, die das zugehörige SCSS importiert — auch wenn sie sonst keine Logik enthält.
- Keine globalen Styles in Modul- oder Snippet-SCSS-Dateien.

#### Grundregel und Breakpoint-Blöcke

**In einen `mediaquery()`-Block gehört nur, was sich pro Breakpoint unterscheidet** – in der Praxis fast nur Aufrufe mit `$layout`. Feste Werte wie `display: flex` oder `position: fixed` stehen einmal in der Grundregel oben in der Datei. Einen Breakpoint-Block nie als Kopie eines anderen anlegen: Genau so wandern feste Werte in alle drei Blöcke.

Gleich *geschriebene* `$layout`-Aufrufe wie `font($layout, 14, 20)` sind keine Wiederholung – sie ergeben pro Breakpoint andere Werte und bleiben in den Blöcken.

Das PostCSS-Plugin `@profitlich/template-toolkit/vite/postcssBreakpointDry` meldet beim Build und im Dev-Server, wo es trotzdem passiert ist: Deklarationen, die mit gleichem Selektor und Wert in Media-Queries stehen, die zusammen alle Breiten abdecken, und solche, die nur die Grundregel wiederholen. Es warnt nur. Eingebunden in `postcss.config.js`:

```js
import postcssBreakpointDry from '@profitlich/template-toolkit/vite/postcssBreakpointDry';

export default {
    plugins: [postcssBreakpointDry()],
};
```

#### vw-Basis

Per Default skalieren vw-basierte Werte mit der Viewport-Breite inkl. Scrollbar (`100vw`). Mit `"vwBasis": "body"` als Top-Level-Feld in `src/config.json` skalieren sie stattdessen mit der scrollbar-freien Body-Breite — sinnvoll, wenn Layout-Elemente in `%` gesetzt sind und Schriften/Abstände exakt mit diesen mitskalieren sollen. Dafür im Projekt `VwBody.getInstance()` (aus `@profitlich/template-toolkit/utils/VwBody`) aufrufen — setzt die Custom Property `--vw-body` per JS. Default-Verhalten ohne Feld unverändert.

**Wichtig bei vwBasis "body"**: Werte aus `size()`, `columns()`, `marginPadding()` sind dann CSS-`calc()`-Ausdrücke. Sass kann sie ausserhalb eines `calc()`-Wrappers nicht arithmetisch kombinieren. Statt `($a - $b)` mit Sass-Parens → `calc($a - $b)`. Auch im Default-Modus ist diese Schreibweise unschädlich, also generell als Konvention nutzen.

#### Capsize

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

**Capsize und Breakpoints**: Die Trims sind em-Werte und hängen nur von der Schrift und vom Verhältnis Zeilenhöhe/Schriftgrösse ab, nicht von `$layout`. Ist das Verhältnis in **allen** Breakpoints gleich (z. B. überall 14/20), gehört `capsize()` einmal in die Grundregel, und in den Breakpoints steht `font()` ohne 4. Argument:

```scss
.foo { @include capsize("soehne", 14, 20); }
@include mediaquery(tablet) using ($layout) {
    .foo { @include font($layout, 14, 20); }
}
```

Sonst nur, wenn wirklich jeder Breakpoint Capsize bekommt – in den übrigen entstünden Pseudo-Elemente ohne Trims, die in einem Flex- oder Grid-Container als zusätzliche Items mitlaufen.

Bei verschiedenen Verhältnissen (z. B. 40/70, 56/120, 111/120) bleibt `font(…, "soehne")` in jedem Breakpoint. `content` und `display` der Pseudo-Elemente stehen dann in jedem Breakpoint erneut; `postcssBreakpointDry` übergeht sie in diesem Fall, weil sich das Pseudo-Element nur als Ganzes verschieben liesse.

### Vite Entry

Einen neuen Entry in `rollupOptions.input` eintragen **nur wenn** das Script per Twig/PHP-Tag direkt eingebunden wird. Wird es von einem anderen Script importiert, braucht es keinen eigenen Entry.

### Bilder

Kein `lazysizes`. Ausschliesslich natives `loading="lazy"`.
