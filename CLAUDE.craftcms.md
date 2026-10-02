### Craft CMS

**Keine Content-Security-Policy, keine Nonces.** Sie biss sich mit zu vielem, und mit Blitz liefert die statische Seite bei jedem Aufruf dieselben Nonces aus. Skripte werden ohne Nonce registriert:

```twig
{% do craft.vite.register("src/modules/module-name/Module.js", false) %}
```

Die Sicherheits-Header (HSTS, `X-Content-Type-Options`, `X-Frame-Options`) setzt die `.htaccess` mit `Header always set`, nicht ein Plugin: Seiten, die Blitz statisch ausliefert, erreichen PHP nie. Prüfen per `GET` (`curl -s -D - -o /dev/null <url>`), nicht mit `curl -I` – ein `HEAD` läuft an Blitz vorbei durch PHP.

**Project Config:** Feld- und Struktur-Änderungen können direkt in den YAML-Dateien unter `config/project/` gemacht werden, danach `ddev craft project-config/apply` (Kontrolle vorher mit `project-config/diff`). `allowAdminChanges` ist üblicherweise nur in der Dev-Umgebung aktiv, Änderungen über die Oberfläche gehen also ausschliesslich lokal.

Project-Config-Änderungen lassen sich nicht sinnvoll auf mehrere Commits aufteilen, weil `project.yaml` mit seinem `dateModified` an allem hängt.

**Templates sind generiert:** `templates/` entsteht aus `src/` (`ddev npm run copy`, während der Entwicklung `ddev npm run dev`) und ist gitignoriert. Änderungen gehören immer nach `src/`; eine Bearbeitung in `templates/` ist beim nächsten Copy-Lauf verloren.
