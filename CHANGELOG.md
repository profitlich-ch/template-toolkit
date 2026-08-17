# Changelog

Alle nennenswerten Änderungen an `@profitlich/template-toolkit` werden in dieser Datei dokumentiert.

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionierung nach [SemVer](https://semver.org/lang/de/).

**Konsumenten-Update-Workflow:** Beim Bump der Toolkit-Version in einem Projekt diese Datei von der bisherigen Version aufwärts lesen. Jede `### Breaking Changes`-Section enthält ein Migrations-Diff, das im konsumierenden Projekt 1:1 angewendet werden kann.

## [Unreleased]

## [5.5.1] – 2026-08-17

### Fixed
- **`syncConventions()` schreibt nicht mehr in die Vorlagen-Repos.** `template-craftcms` und `template-kirbycms` haben eigenen Quellcode und laufen bei ihrer Entwicklung durch denselben `copy`-Task — der Block landete dort also bei jedem `npm run dev`. Damit stand derselbe Text zusätzlich in der Vorlage, als Schnappschuss, der wie die Quelle aussieht, beim Ableiten aber ohnehin überschrieben wird. Erkannt wird das am Verzeichnisnamen; die Vorlagen geben nur noch das leere Markenpaar weiter.

## [5.5.0] – 2026-08-17

### Added
- **Konventionen für Konsumenten reisen im Paket mit**: `CLAUDE.project.md` (alle Projekte), `CLAUDE.craftcms.md` und `CLAUDE.kirbycms.md`. `scripts/sync-conventions.js` schreibt sie beim `copy`-Lauf des Konsumenten zwischen die Marken `<!-- toolkit:start -->` und `<!-- toolkit:end -->` seiner `CLAUDE.md`. Kopiert statt verlinkt, weil Claude keine Dateien aus `node_modules` liest.

    Der Block hängt an der installierten Paketversion, nicht am neuesten Stand: Ein Projekt zieht Änderungen erst beim Versions-Bump, und dann sichtbar als git-Diff. Deshalb liegen die Sorten-Dateien hier und nicht in den Template-Repos — npm ist an eine Version gebunden, ein lokal geklontes Repo kann veraltet sein, ohne dass es auffällt.

    Aktivieren im Konsumenten — ohne diese zwei Schritte passiert nichts:

    ```diff
    # CLAUDE.md
    +<!-- toolkit:start -->
    +<!-- toolkit:end -->

    # scripts/copy-files.js
    -run(copyTasks);
    +run(copyTasks, { template: 'craftcms' });   // oder 'kirbycms'
    ```

    Alles ausserhalb der Marken bleibt unangetastet und geht im Konfliktfall vor. Fehlen die Marken, wird nur ein Hinweis ausgegeben.

### Changed
- **Entwicklungskonventionen**: `git mv`, Commit-Message-Stil und der Ablauf des Release-Workflows stehen jetzt in der globalen `~/.claude/CLAUDE.md`; die `CLAUDE.md` dieses Repos führt nur noch die Besonderheiten des Pakets. Die bisherige Regel «Branches und Commits nie von Claude» ist entfallen — global gilt: Commits nur auf Aufforderung oder nach Rückfrage. Wirkt ohne Release, ab dem nächsten `git pull`.
- **`run()` in `scripts/copy-files.js`** ruft den Konventions-Sync vorab auf und nimmt dafür zwei neue Optionen entgegen: `template` (`'craftcms'` | `'kirbycms'`) und `syncConventions: false` zum Abschalten. Ohne Marken in der `CLAUDE.md` verhält sich `run()` wie bisher.

## [5.4.0] – 2026-06-16

### Added
- **MenuToggle**: Neue Option `linkClickClosesMenu` (default `true`). Bei `false` bleibt das Menü beim Klick auf einen `menuLinkSelector`-Link offen. Default bewahrt das bisherige Verhalten.

## [5.3.3] – 2026-05-28

### Added
- Changelog erstellt, startend mit 5.0.0

## [5.3.2] – 2026-05-28

### Fixed
- `font()`-Mixin (`scss/core/layout.scss`) gibt nun eine verständliche Sass-Warnung aus, wenn das 4. Argument kein String ist (typische Altlast aus der API vor Capsize-Umstellung, wo dort `font-weight` stand) und überspringt Capsize, statt mit kryptischem Fehler abzubrechen.
- `capsize`-Mixin (`scss/core/capsize.scss`) prüft, ob die Sass-Custom-Function `capsize-pseudo-elements` registriert ist. Ohne Vite-Setup (`createCapsizeFunctions` in `vite.config.js`) wird der Aufruf mit Warnung übersprungen, statt mit Compile-Fehler abzubrechen.

## [5.3.1] – 2026-05-28

### Fixed
- Toolbar-Label für die `sizes`-Option korrigiert: `sizes` → `Sizes` (kosmetisch).

## [5.3.0] – 2026-05-28

### Added
- **Toolbar**: Neue Dev-Option `Sizes` (`dev/toolbar/Toolbar.js`). Schaltet Overlay-Labels an `<picture>`-Elementen ein, die deren `sizes`-Attribut anzeigen (Media-Conditions weggekürzt, nur die Längenwerte). Persistiert wie die anderen Toolbar-Optionen in `localStorage`. Erfordert keine Änderung im Konsumenten — Option erscheint automatisch in der Toolbar.

## [5.2.3] – 2026-05-27

### Fixed
- **MenuToggle**: Bei `fixElementSelector` ≠ Body wird beim Öffnen `window.scrollTo(0, 0)` ausgeführt. Ohne diesen Reset erschien ein absolut positioniertes Menü um den vorherigen Scroll-Betrag verschoben.

## [5.2.2] – 2026-05-27

### Fixed
- **MenuToggle**: Wenn ein eigenes `fixElementSelector` gesetzt ist (also nicht Body), wird `paddingRight` nicht mehr gesetzt/zurückgesetzt — Scrollbar-Ausgleich ist nur beim Body nötig, bei anderen Elementen bleibt die Seiten-Scrollbar bestehen.

## [5.2.1] – 2026-05-27

### Fixed
- **MenuToggle**: Scrollbar-Messung, Scroll-Position-Sicherung und Setzen von `data-menu-fixed` in private Methode `#applyFix()` extrahiert, damit die Reihenfolge bei `deferPositionFixed: true` korrekt nach dem Timeout läuft.

## [5.2.0] – 2026-05-27

### Changed
- **Capsize-Build**: Import in `vite/capsizeSassFunctions.js` umgestellt auf `@capsizecss/unpack/fs` (statt `@capsizecss/unpack`). Setzt eine aktuelle `@capsizecss/unpack`-Version voraus, in der der `/fs`-Subpath verfügbar ist (Peer-Dependency-Bereich `>=4.0.0` ist abgedeckt). Keine Änderung im Konsumenten nötig.

## [5.1.0] – 2026-05-27

### Changed
- Umfangreiche JSDoc-Ergänzungen über fast alle öffentlichen APIs: `MenuToggle`, `MuxPlayer`, `Dev`, `Toolbar`, `BodyScrolled`, `MailAdresses`, `MediaQueries`, `Vh100`, `VwBody`, `ImagesLoaded`, `copy-files`, `deploy`, `jsonToScss`. Reine Dokumentation, kein Verhaltens-Change.

## [5.0.0] – 2026-05-27

### Breaking Changes

- **MenuToggle**: Die `getInstance`-Optionen wurden komplett von ID-/Klassen-Strings auf CSS-Selektoren umgestellt. Zusätzlich wurde `fixBody` durch `lockScroll` ersetzt, und das fixierte Element ist über das neue `fixElementSelector` frei wählbar (Default: `document.body`).

  **Options-Mapping:**

  | Alt (≤ 4.x)                | Neu (5.x)                          | Wert-Transformation         |
  |----------------------------|------------------------------------|------------------------------|
  | `menuButtonId: 'foo'`      | `menuButtonSelector: '#foo'`       | ID → `#id`                   |
  | `menuId: 'foo'`            | `menuSelector: '#foo'`             | ID → `#id`                   |
  | `menuItemClass: 'foo'`     | `menuItemSelector: '.foo'`         | Klassenname → `.class`       |
  | `shiftElementId: 'foo'`    | `shiftElementSelector: '#foo'`     | ID → `#id`                   |
  | `fixBody: true \| false`   | `lockScroll: true \| false`        | nur umbenannt                |
  | —                          | `fixElementSelector: '#foo'` *(opt., default Body)* | neu        |
  | `menuLinkSelector: '.foo'` | `menuLinkSelector: '.foo'`         | unverändert                  |

  **Migrations-Diff:**

  ```diff
    MenuToggle.getInstance({
  -     menuButtonId: 'menu-toggle',
  -     menuId: 'menu',
  -     menuItemClass: 'menu',
  -     shiftElementId: 'header',
  -     fixBody: true,
  +     menuButtonSelector: '#menu-toggle',
  +     menuSelector: '#menu',
  +     menuItemSelector: '.menu',
  +     shiftElementSelector: '#header',
  +     lockScroll: true,
  +     // fixElementSelector: '#seite',  // optional; default document.body
        menuLinkSelector: '.menu__link',
    });
  ```

  Der DOM-Marker `data-menu-fixed` wandert vom Body auf das via `fixElementSelector` gewählte Element. CSS, das `body[data-menu-fixed="true"]` selektiert, muss auf den neuen Selektor angepasst werden (z. B. `#seite[data-menu-fixed="true"]`), wenn ein eigenes Fix-Element verwendet wird. Bei Default (Body) bleibt das Verhalten gleich.

[Unreleased]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.5.1...HEAD
[5.5.1]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.5.0...v5.5.1
[5.5.0]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.4.0...v5.5.0
[5.4.0]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.3.3...v5.4.0
[5.3.3]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.3.2...v5.3.3
[5.3.2]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.3.1...v5.3.2
[5.3.1]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.3.0...v5.3.1
[5.3.0]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.2.3...v5.3.0
[5.2.3]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.2.2...v5.2.3
[5.2.2]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.2.1...v5.2.2
[5.2.1]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.2.0...v5.2.1
[5.2.0]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.1.0...v5.2.0
[5.1.0]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.0.0...v5.1.0
[5.0.0]: https://github.com/profitlich-ch/profitlich-template-toolkit/releases/tag/v5.0.0
