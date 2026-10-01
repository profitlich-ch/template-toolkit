import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

/**
 * @typedef {Object} PageSpeedPage
 * @property {string} name - Anzeigename in der Ausgabe.
 * @property {string} path - Pfad relativ zur Basis-URL der Umgebung, z. B. `/projekte/beispiel`.
 */

/**
 * @typedef {Object} PageSpeedOptions
 * @property {{ mobile?: number, desktop?: number }} [thresholds] - Mindest-Score Performance (0–100) je Gerät. Darunter: Warnung und Exit-Code 1.
 * @property {number} [runs=3]        - Läufe pro Seite; gewertet wird der Median.
 * @property {string} [outDir='.pagespeed'] - Ablage der Ergebnisse, relativ zum Projekt. Gehört in die `.gitignore`.
 */

const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

const METRICS = [
    { key: 'fcp', audit: 'first-contentful-paint', label: 'FCP', format: ms },
    { key: 'lcp', audit: 'largest-contentful-paint', label: 'LCP', format: ms },
    { key: 'tbt', audit: 'total-blocking-time', label: 'TBT', format: ms },
    { key: 'cls', audit: 'cumulative-layout-shift', label: 'CLS', format: v => v.toFixed(3) },
    { key: 'si', audit: 'speed-index', label: 'SI', format: ms },
];

function ms(value) {
    return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fail(message) {
    console.error(`❌ ${message}`);
    process.exit(1);
}

async function measure(url, strategy, key) {
    const params = new URLSearchParams({ url, strategy, key });
    CATEGORIES.forEach(category => params.append('category', category));

    const response = await fetch(`${API}?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? `HTTP ${response.status}`);

    const { categories, audits } = data.lighthouseResult;
    const result = { scores: {}, metrics: {}, savings: {} };

    for (const category of CATEGORIES) {
        result.scores[category] = Math.round((categories[category]?.score ?? 0) * 100);
    }
    for (const metric of METRICS) {
        result.metrics[metric.key] = audits[metric.audit]?.numericValue ?? 0;
    }
    // Ältere Audits melden `overallSavingsMs`, die Insights ab Lighthouse 12
    // nur noch `metricSavings` je Kennzahl.
    for (const [id, audit] of Object.entries(audits)) {
        const saving = audit.details?.overallSavingsMs
            ?? Math.max(audit.metricSavings?.LCP ?? 0, audit.metricSavings?.FCP ?? 0);
        if (saving > 0 && audit.score !== null && audit.score < 0.9) {
            result.savings[id] = { title: audit.title, ms: saving };
        }
    }
    return result;
}

/** Fasst die Läufe einer Seite zum Median zusammen; Einsparpotenziale aus dem mittleren Lauf. */
function summarize(runs) {
    const scores = Object.fromEntries(CATEGORIES.map(c => [c, median(runs.map(r => r.scores[c]))]));
    const metrics = Object.fromEntries(METRICS.map(m => [m.key, median(runs.map(r => r.metrics[m.key]))]));
    const middle = [...runs].sort((a, b) => a.scores.performance - b.scores.performance)[Math.floor(runs.length / 2)];
    const savings = Object.entries(middle.savings)
        .sort(([, a], [, b]) => b.ms - a.ms)
        .slice(0, 3)
        .map(([id, s]) => ({ id, ...s }));
    return { scores, metrics, savings };
}

async function previousResult(dir) {
    try {
        const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json')).sort();
        if (!files.length) return null;
        return JSON.parse(await fs.readFile(path.join(dir, files.at(-1)), 'utf8'));
    } catch {
        return null;
    }
}

function delta(current, previous, lowerIsBetter, format) {
    if (previous === undefined) return '';
    const diff = current - previous;
    if (Math.abs(diff) < 0.0005) return ' (±0)';
    const better = lowerIsBetter ? diff < 0 : diff > 0;
    const sign = diff > 0 ? '+' : '−';
    return ` (${better ? '▲' : '▼'} ${sign}${format(Math.abs(diff))})`;
}

function report(page, result, previous, threshold) {
    const { scores, metrics, savings } = result;
    const below = threshold !== undefined && scores.performance < threshold;

    console.log(`\n${below ? '⚠️ ' : '✅'} ${page.name}  ${page.url}`);
    console.log(`   Performance ${scores.performance}${delta(scores.performance, previous?.scores.performance, false, String)}`
        + `${below ? `  – unter Schwelle ${threshold}` : ''}`);
    console.log(`   Accessibility ${scores.accessibility} · Best Practices ${scores['best-practices']} · SEO ${scores.seo}`);
    console.log('   ' + METRICS.map(m =>
        `${m.label} ${m.format(metrics[m.key])}${delta(metrics[m.key], previous?.metrics[m.key], true, m.format)}`
    ).join(' · '));
    for (const s of savings) console.log(`   → ${s.title} (~${ms(s.ms)})`);

    return below;
}

/**
 * Misst die Seiten einer Umgebung über die PageSpeed-Insights-API und vergleicht
 * mit dem letzten Lauf. Liest `process.argv`: Umgebung (`staging` oder
 * `production`), optional `--desktop` und `--runs=<n>`.
 *
 * Erwartet in der `.env`: `PAGESPEED_API_KEY` und `PAGESPEED_URL_<UMGEBUNG>`.
 * @param {PageSpeedPage[]} pages
 * @param {PageSpeedOptions} [options]
 */
export async function run(pages, { thresholds = {}, runs = 3, outDir = '.pagespeed' } = {}) {
    const args = process.argv.slice(2);
    const mode = args.find(a => !a.startsWith('--'));
    const strategy = args.includes('--desktop') ? 'desktop' : 'mobile';
    const runsArg = args.find(a => a.startsWith('--runs='));
    const runCount = runsArg ? Number(runsArg.split('=')[1]) : runs;

    if (mode !== 'staging' && mode !== 'production') {
        fail('Umgebung angeben: "staging" oder "production", z. B. ddev npm run pagespeed -- production');
    }

    dotenv.config({ quiet: true });
    const key = process.env.PAGESPEED_API_KEY;
    const base = process.env[`PAGESPEED_URL_${mode.toUpperCase()}`];
    if (!key) fail('PAGESPEED_API_KEY fehlt in der .env.');
    if (!base) fail(`PAGESPEED_URL_${mode.toUpperCase()} fehlt in der .env.`);

    const dir = path.resolve(outDir, mode, strategy);
    const previous = await previousResult(dir);
    console.log(`PageSpeed ${mode}, ${strategy}, ${runCount} Läufe pro Seite (Median)`
        + (previous ? `, Vergleich mit ${previous.date}` : ''));

    const results = {};
    let failed = false;

    for (const page of pages) {
        const url = new URL(page.path, base).href;
        const measured = [];
        // Nacheinander, nicht parallel: Gleichzeitige Läufe gegen denselben
        // Server beeinflussen sich gegenseitig und verfälschen die Zeiten.
        for (let i = 0; i < runCount; i++) {
            try {
                measured.push(await measure(url, strategy, key));
            } catch (error) {
                console.error(`   Lauf ${i + 1} für ${page.name} fehlgeschlagen: ${error.message}`);
            }
        }
        if (!measured.length) {
            failed = true;
            continue;
        }
        results[page.path] = summarize(measured);
        const below = report({ ...page, url }, results[page.path], previous?.pages[page.path], thresholds[strategy]);
        failed ||= below;
    }

    const stamp = new Date().toISOString().slice(0, 19);
    const date = stamp.slice(0, 16).replace('T', ' ');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
        path.join(dir, `${stamp.replace(/[:T]/g, '-')}.json`),
        JSON.stringify({ date, mode, strategy, runs: runCount, pages: results }, null, 2)
    );

    process.exit(failed ? 1 : 0);
}
