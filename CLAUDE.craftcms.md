### Craft CMS

**CSP Nonce:** Beim Einbinden eines Scripts immer den Nonce mitgeben, sonst blockt die Content-Security-Policy es:

```twig
{% do craft.vite.register("src/modules/module-name/Module.js", false, { 'nonce': csp('script-src') }) %}
```

Dasselbe gilt für per `view.registerCss()` eingebettetes CSS: `{ nonce: csp('style-src') }`.

**Project Config:** Feld- und Struktur-Änderungen können direkt in den YAML-Dateien unter `config/project/` gemacht werden, danach `ddev craft project-config/apply` (Kontrolle vorher mit `project-config/diff`). `allowAdminChanges` ist üblicherweise nur in der Dev-Umgebung aktiv, Änderungen über die Oberfläche gehen also ausschliesslich lokal.

Project-Config-Änderungen lassen sich nicht sinnvoll auf mehrere Commits aufteilen, weil `project.yaml` mit seinem `dateModified` an allem hängt.

**Templates sind generiert:** `templates/` entsteht aus `src/` (`ddev npm run copy`, während der Entwicklung `ddev npm run dev`) und ist gitignoriert. Änderungen gehören immer nach `src/`; eine Bearbeitung in `templates/` ist beim nächsten Copy-Lauf verloren.
