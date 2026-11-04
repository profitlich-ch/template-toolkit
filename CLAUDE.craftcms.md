### Craft CMS

**Keine Content-Security-Policy, keine Nonces.** Sie biss sich mit zu vielem, und mit Blitz liefert die statische Seite bei jedem Aufruf dieselben Nonces aus. Skripte werden ohne Nonce registriert:

```twig
{% do craft.vite.register("src/modules/module-name/Module.js", false) %}
```

**Modul-CSS kommt allein über das JS des Moduls, kein Sammel-Import in `app.scss`.** craft-vite gibt beim `register` eines Entries auch dessen CSS als `<link>` aus; ein Sammel-Import baut jede Regel deshalb zweimal – in `app.css` und in der Datei des Moduls – und lädt auf jeder Seite alle Module, auch die, die sie nicht zeigt.

*Anlass:* In `appert-zwahlen.ch` fiel `app.css` ohne Sammel-Import von 95 auf 5,5 kB (`template-craftcms` #363, 2026-11-04).

Fehlt der Entry in `rollupOptions.input`, fehlt in Produktion das CSS des Moduls. Der Dev-Server liefert jede Datei aus, lokal fällt die Lücke deshalb nicht auf. Ein neues Modul ist erst fertig, wenn `ddev npm run build` seine CSS-Datei ausgibt.

**`App.js` im `<head>` registrieren, vor jedem Modul.** Die Reihenfolge der `craft.vite.register`-Aufrufe ist die der `<link>`-Tags. Ein Modul im Layout – etwa das Menü – registriert sich sonst vor `App.js`, und bei gleicher Spezifität gewinnen die Basis-Regeln aus `app.css` gegen das Modul. `Dev.js` bleibt am Ende des `<body>`.

*Anlass:* Mit dem Sammel-Import der Modul-SCSS fiel das nicht auf, weil `app.css` die Modulregeln ein zweites Mal enthielt; ohne ihn kehrte sich die Kaskade um (`template-craftcms` #363, 2026-11-04).

Die Sicherheits-Header (HSTS, `X-Content-Type-Options`, `X-Frame-Options`) setzt die `.htaccess` mit `Header always set`, nicht ein Plugin: Seiten, die Blitz statisch ausliefert, erreichen PHP nie. Prüfen per `GET` (`curl -s -D - -o /dev/null <url>`), nicht mit `curl -I` – ein `HEAD` läuft an Blitz vorbei durch PHP.

**Project Config:** Feld- und Struktur-Änderungen können direkt in den YAML-Dateien unter `config/project/` gemacht werden, danach `ddev craft project-config/apply` (Kontrolle vorher mit `project-config/diff`). `allowAdminChanges` ist üblicherweise nur in der Dev-Umgebung aktiv, Änderungen über die Oberfläche gehen also ausschliesslich lokal.

Project-Config-Änderungen lassen sich nicht sinnvoll auf mehrere Commits aufteilen, weil `project.yaml` mit seinem `dateModified` an allem hängt.

**Templates sind generiert:** `templates/` entsteht aus `src/` (`ddev npm run copy`, während der Entwicklung `ddev npm run dev`) und ist gitignoriert. Änderungen gehören immer nach `src/`; eine Bearbeitung in `templates/` ist beim nächsten Copy-Lauf verloren.
