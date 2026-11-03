# 0001 — Gestaltungswerte als Design Tokens in einer Resolver-Datei

**Status:** angenommen, 2026-11-03

## Kontext

Jedes Projekt führt Breakpoints, Layouts, Farben, Abstände, Raster und Textstile in einer `src/config.json`, in einer eigenen Form ohne Typen: `"farbe1a": "#837CFF"`, Masse als nackte Zahlen, Werte je Layout als verschachtelte Schlüssel. Im Toolkit lesen sie `jsonToScss`, `scssOptions`, die Dev-Toolbar, `gridColumns` und `VwBody`, in einem Projekt wie `ksasz.ch` dazu rund zwanzig eigene Stellen: SCSS, die Modulübersicht im Control Panel, Tests.

Die Gestaltung entsteht in Figma. Zwischen Figma-Variablen und der `config.json` gibt es keinen Weg ausser Abschreiben, und eine Abweichung fällt erst im Browser auf. Ziel ist, dass die Werte später aus Figma kommen. Dieser Entscheid ist die Vorbereitung dafür; den Austausch mit Figma baut er nicht.

Die Design Tokens Community Group des W3C hat am 2025-10-28 die erste stabile Fassung ihres Formats veröffentlicht (Format Module 2025.10), zusammen mit dem Resolver Module 2025.10. Das Format gibt jedem Wert einen Typ (`$type`, `$value`), kennt Verweise zwischen Werten und zusammengesetzte Typen wie `typography`. Modes kennt es nicht; die beschreibt der Resolver: Sets für Werte, die überall gelten, Modifiers mit Contexts für Werte, die wechseln, und eine Reihenfolge, in der beides übereinanderliegt. Figma hat Import und Export von Variablen in diesem Format angekündigt, je Mode eine Datei.

## Entscheidung

- Die Gestaltungswerte eines Projekts stehen im Format 2025.10 in **einer** Resolver-Datei, `src/tokens.resolver.json`. Die Tokens stehen in der Datei selbst, nicht in eigenen Dateien, auf die sie verweist.
- Was in jedem Layout gilt, steht im Set `basis`. Was je Layout wechselt, steht im Modifier `layout`, mit einem Context je Layout, benannt wie in der `config.json`.
- Tokens sind nur Gestaltungswerte: Farben, Abstände, Textstile, Raster (Spalten, Gutter, Ränder). Einstellungen bleiben in der `config.json`: `layouts`, `breakpoints`, `units`, `fonts`, `vwBasis` und was sonst kein Token ist.
- Das Toolkit liest Gestaltungswerte nur noch aus der Resolver-Datei. Die alte Form liest es nicht mehr. Das ist ein Breaking Change und erscheint als neue Major-Version.
- Der Austausch mit Figma gehört nicht dazu und wird gebaut, wenn der Arbeitsablauf ihn trägt.

## Begründung

Ein Standard statt der eigenen Form: Der Typ sagt jedem Werkzeug, was ein Wert ist, auch der Modulübersicht, die heute Farben an einem Namenspräfix erkennt. Verweise erlauben Aliase, ohne Werte zu kopieren. Und Figma liest und schreibt dieselbe Form, sobald es so weit ist.

Eine Datei, weil ein Token so an einer Stelle steht, mit allen seinen Layouts nebeneinander. Der Resolver erlaubt das ausdrücklich: Die Quellen eines Context sind laut Spezifikation «ein Verweis, Tokens direkt oder beides». Figmas Dateien je Mode lassen sich mechanisch daraus gewinnen (jeden Context auflösen) und wieder hineinschreiben (jede Datei in ihren Context). Dafür braucht es kein eigenes Wissen über die Form, beide Seiten sprechen denselben Standard.

Verworfen:

- **Eine Datei je Layout**, wie Figma sie exportiert, dazu ein Resolver, der auf sie verweist. Ebenso standardkonform und für Figma ohne Umweg, aber ein Textstil stünde in vier Dateien, und eine vergessene fiele erst im Browser auf.
- **Eine Format-Datei mit den Werten je Layout unter `$extensions`.** Eine Datei, aber die Layouts wären eine eigene Erfindung, die weder Figma noch ein anderes Werkzeug versteht.
- **Beide Formate lesen**, damit Projekte einzeln umstellen. Das Toolkit pflegte zwei Leser auf unbestimmte Zeit. Ein Projekt stellt beim Update ohnehin um; die Migration ist einmalig und mechanisch.
- **Nur das Projekt umstellen**, mit einem Skript, das zur Bauzeit die alte `config.json` fürs Toolkit erzeugt. Daneben stünde eine zweite Datei, die nur ein Abbild ist und bei einem vergessenen Lauf auseinanderläuft.
- **Auch die Einstellungen als Tokens.** Breakpoints und Layouts sind keine Gestaltungswerte, Figma kennt sie nicht als Variablen, und im Resolver bestimmen die Layouts erst, welche Contexts es gibt.

## Konsequenzen

- Jedes Projekt teilt beim Update seine `config.json` in Einstellungen und `src/tokens.resolver.json`. Der Changelog führt das unter «Breaking Changes» mit dem Migrations-Diff.
- Die Regel «`src/config.json` ist die einzige Quelle für Breakpoints, Layouts, Farben» in `CLAUDE.craftcms.md` und `CLAUDE.project.md` wird umgeschrieben: zwei Dateien, jede die einzige Quelle für ihren Teil.
- Masse sind `dimension` mit der Einheit `px` und meinen Pixel des Entwurfs; `size()`, `columns()` und `marginPadding()` rechnen sie weiter in die Einheit des Layouts um. Farben sind Objekte mit Farbraum und Komponenten statt eines Hex-Strings; die Datei wird länger und lässt sich schlechter von Hand lesen.
- Den Resolver lesen bisher wenige Werkzeuge, Style Dictionary etwa noch nicht. Das Toolkit liest ihn selbst; ein fremdes Werkzeug, das später dazukommt, braucht womöglich einen Zwischenschritt über die aufgelösten Dateien je Layout.
- Die Spezifikation des Resolvers ist eine Fassung der Community Group, kein W3C-Standard. Eine neue Fassung kann eine weitere Migration nach sich ziehen.
