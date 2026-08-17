# CLAUDE.md – Entwicklungskonventionen

Dieses Repo ist `@profitlich/template-toolkit` — das npm-Paket mit SCSS-System, JS-Utilities, Komponenten und Build-Skripten. Konsumiert wird es von `template-craftcms`, `template-kirbycms` und allen daraus abgeleiteten Projekten.

## Konventionen für Konsumenten

**Diese Datei betrifft nur die Arbeit am Toolkit selbst.** Was für konsumierende Projekte gilt, liegt in eigenen Dateien daneben und wird über das Paket verteilt:

| Datei | gilt für |
| --- | --- |
| `CLAUDE.md` | dieses Repo |
| `CLAUDE.project.md` | alle Projekte |
| `CLAUDE.craftcms.md` | Craft-Projekte |
| `CLAUDE.kirbycms.md` | Kirby-Projekte |

`scripts/sync-conventions.js` schreibt beim `copy`-Lauf des Konsumenten `CLAUDE.project.md` plus die passende Sorte zwischen die Marken `<!-- toolkit:start -->` und `<!-- toolkit:end -->` seiner `CLAUDE.md`. Kopiert statt verlinkt, weil Claude keine Dateien aus `node_modules` liest.

Der Block hängt an der **installierten** Paketversion: Ein Projekt zieht Änderungen erst beim Versions-Bump, und dann sichtbar als git-Diff. Das ist der Grund, warum die Sorten-Dateien hier liegen und nicht in den Template-Repos — npm ist an eine Version gebunden, ein lokal geklontes Repo kann veraltet sein, ohne dass es auffällt.

Neue Dateien dieser Art gehören ins `files`-Feld der `package.json`, sonst reisen sie nicht mit.

## Toolkit vs. Projekt

Code gehört ins **Toolkit**, wenn er in mehr als einem Projekt verwendet wird oder werden könnte und keine projektspezifischen Pfade oder Inhalte enthält. Bei Toolkit-Änderungen: Version bumpen → publishen → hier in `package.json` updaten.

Code bleibt im **Projekt**, wenn er projektspezifische Pfade, CSS-Klassen oder CMS-Eigenheiten enthält.

### Toolkit-Release-Workflow

Der Ablauf – inhaltlicher Commit gegen Versions-Commit, SemVer-Entscheidung, Sektionsreihenfolge –
steht in der globalen `CLAUDE.md`. Die Sektionen heissen hier **englisch** (`Added`, `Changed`,
`Fixed`), weil der Changelog eines npm-Pakets englisch geführt wird. Dazu drei Besonderheiten
dieses Repos:

- Im inhaltlichen Commit bei `Breaking Changes` gleich das Migrations-Diff (Vorher/Nachher als
  ```diff```-Block) und Hinweise auf zu migrierende DOM-Marker oder CSS-Selektoren mitschreiben,
  solange der Kontext frisch ist.
- Im Versions-Commit die zwei Markdown-Referenz-Link-Zeilen am Dateiende anpassen; sie machen die
  `[X.Y.Z]` im Section-Header zu GitHub-Compare-Links:
    - Neue Zeile anhängen: `[X.Y.Z]: https://github.com/profitlich-ch/profitlich-template-toolkit/compare/vPrev...vX.Y.Z`
    - `[Unreleased]`-Zeile updaten: `…compare/vPrev...HEAD` → `…compare/vX.Y.Z...HEAD`
- Nach dem Tag **publishen**, dann in konsumierenden Projekten `package.json` updaten — beim Update
  nur die `CHANGELOG.md` von der bisherigen Version aufwärts lesen, um die nötigen Anpassungen zu
  erkennen.
