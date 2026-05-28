# Changelog

Alle nennenswerten Änderungen an `@profitlich/template-toolkit` werden in dieser Datei dokumentiert.

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionierung nach [SemVer](https://semver.org/lang/de/).

**Konsumenten-Update-Workflow:** Beim Bump der Toolkit-Version in einem Projekt diese Datei von der bisherigen Version aufwärts lesen. Jede `### Breaking Changes`-Section enthält ein Migrations-Diff, das im konsumierenden Projekt 1:1 angewendet werden kann.

## [Unreleased]

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

[Unreleased]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.3.2...HEAD
[5.3.2]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.3.1...v5.3.2
[5.3.1]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.3.0...v5.3.1
[5.3.0]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.2.3...v5.3.0
[5.2.3]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.2.2...v5.2.3
[5.2.2]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.2.1...v5.2.2
[5.2.1]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.2.0...v5.2.1
[5.2.0]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.1.0...v5.2.0
[5.1.0]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/v5.0.0...v5.1.0
[5.0.0]: https://github.com/profitlich-ch/profitlich-template-toolkit/releases/tag/v5.0.0
