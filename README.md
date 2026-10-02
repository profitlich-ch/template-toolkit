# @profitlich/template-toolkit

Gemeinsamer Unterbau der Website-Projekte: SCSS-Layoutsystem, JS-Utilities, Komponenten, Build- und Deploy-Skripte – und die Arbeitsregeln dazu. Eingebunden wird es von `template-craftcms`, `template-kirbycms` und allen daraus abgeleiteten Projekten.

Wie Toolkit, Vorlagen und Projekte zusammenhängen und was auf welche Ebene gehört, steht im [Unternehmenshandbuch](https://profitlich-ch.github.io/unternehmen/starter-kits/toolkit). Diese README beschreibt das Paket selbst.

## Inhalt

| Bereich | Import | Beispiele |
| --- | --- | --- |
| SCSS | `pkg:@profitlich/template-toolkit/scss/forward` | `size()`, `columns()`, `font()`, `marginPadding()`, `mediaquery()`, Capsize |
| Utilities | `…/utils/<Name>` | `MediaQueries`, `VwBody`, `BodyScrolled`, `ImagesLoaded`, `MailAdresses` |
| Komponenten | `…/components/…` | `MenuToggle`, `MuxPlayer` |
| Dev-Toolbar | `…/dev` | `initDev(config, { toggles })`, Raster-Overlay |
| Vite/PostCSS | `…/vite/<Name>` | `jsonToScss`, `capsizeSassFunctions`, `postcssBreakpointDry` |
| Skripte | `…/scripts/<Name>` | `copy-files`, `deploy`, `pagespeed` |

Die vollständige Liste steht unter `exports` in der `package.json`. Was jede Funktion tut, steht in ihrem JSDoc.

## Arbeitsregeln für Projekte

Die Regeln, wie man in diesem Stack arbeitet – ddev, Vite, SCSS, Debug-Code, Performance –, liegen hier und reisen mit dem Paket:

| Datei | gilt für |
| --- | --- |
| `CLAUDE.project.md` | alle Projekte |
| `CLAUDE.craftcms.md` | Craft-Projekte |
| `CLAUDE.kirbycms.md` | Kirby-Projekte |
| `CLAUDE.md` | nur die Arbeit an diesem Repo |

Bei jedem `npm run copy` (also auch bei `build` und `dev`) schreibt `scripts/sync-conventions.js` die passenden Dateien in die `CLAUDE.md` des Projekts, zwischen zwei Marken:

```md
<!-- toolkit:start -->
<!-- toolkit:end -->
```

- **Nur zwischen den Marken** wird ersetzt. Projekteigene Regeln stehen darunter und gehen im Konfliktfall vor.
- **Kopiert, nicht verlinkt**, weil Claude nichts aus `node_modules` liest.
- **An die installierte Version gebunden:** Neue Regeln erscheinen beim Versions-Bump als Git-Diff der `CLAUDE.md`, zusammen mit dem Code, zu dem sie gehören.
- **Die Vorlagen behalten die Marken leer.** Ein neues Projekt erbt das leere Paar und füllt es beim ersten `copy` aus seiner eigenen Toolkit-Version.

Aktivieren lässt es sich in zwei Schritten, beide in den Vorlagen schon erledigt: die Marken in der `CLAUDE.md` und im Projekt

```js
// scripts/copy-files.js
run(copyTasks, { template: 'craftcms' }); // oder 'kirbycms'
```

Eine neue Regel gehört hierher, wenn sie den Stack betrifft, in die Sorten-Datei, wenn sie nur ein CMS betrifft, und unter den Block im Projekt, wenn sie nur dort gilt.

## Ein Projekt auf eine neue Version heben

1. In `CHANGELOG.md` von der bisherigen Version aufwärts lesen. Jede `Breaking Changes`-Sektion enthält ein Migrations-Diff.
2. `ddev npm install @profitlich/template-toolkit@^X.Y.Z`
3. `ddev npm run build`: Damit wird auch der Regelblock der `CLAUDE.md` erneuert. Den Diff durchsehen.

## Am Toolkit arbeiten

Der Release-Ablauf und die Besonderheiten dieses Repos stehen in `CLAUDE.md`. Kurz: Änderung mit Changelog-Eintrag unter `[Unreleased]`, dann ein Versions-Commit mit Tag, dann `npm publish`, dann die Projekte heben.
