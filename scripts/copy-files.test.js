import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { copyAll } from './copy-files.js';

let dir;
const p = (...parts) => path.join(dir, ...parts);
const write = (rel, content = rel) => fs.outputFile(p(rel), content);

const tasks = () => [
    { name: 'templates', src: [p('src/templates/**/*.twig')], dest: p('templates'), base: p('src/templates') },
    { name: 'macros', src: [p('src/macros/**/*.twig')], dest: p('templates/_macros'), base: p('src/macros') },
    { name: 'modulesTwig', src: [p('src/modules/**/*.twig')], dest: p('templates/_modules'), base: p('src/modules') },
    {
        name: 'modulesSvg',
        src: [p('src/modules/**/*.svg'), '!' + p('src/modules/**/_*.*')],
        dest: p('templates/_modules'),
        base: p('src/modules'),
    },
];

beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'copy-files-'));
    await write('src/templates/index.twig');
    await write('src/templates/news/entry.twig');
    await write('src/macros/m.twig');
    await write('src/modules/teaser/teaser.twig');
    await write('src/modules/teaser/icon.svg');
    await write('src/modules/teaser/_entwurf.svg');
});

afterEach(() => fs.remove(dir));

test('kopiert alle Tasks, auch in ineinanderliegende und geteilte Ziele', async () => {
    await copyAll(tasks());
    for (const [dest, src] of [
        ['templates/index.twig', 'src/templates/index.twig'],
        ['templates/news/entry.twig', 'src/templates/news/entry.twig'],
        ['templates/_macros/m.twig', 'src/macros/m.twig'],
        ['templates/_modules/teaser/teaser.twig', 'src/modules/teaser/teaser.twig'],
        ['templates/_modules/teaser/icon.svg', 'src/modules/teaser/icon.svg'],
    ]) {
        assert.equal(await fs.readFile(p(dest), 'utf8'), src);
    }
});

test('Ausschlussmuster mit ! schliessen Dateien aus', async () => {
    await copyAll(tasks());
    assert.equal(await fs.pathExists(p('templates/_modules/teaser/_entwurf.svg')), false);
});

test('entfernt, was keine Quelle mehr hat, samt leer gewordener Ordner', async () => {
    await copyAll(tasks());
    await fs.remove(p('src/templates/news'));
    await write('templates/von-hand.twig');
    await copyAll(tasks());
    assert.equal(await fs.pathExists(p('templates/news')), false);
    assert.equal(await fs.pathExists(p('templates/von-hand.twig')), false);
    assert.equal(await fs.pathExists(p('templates/_macros/m.twig')), true);
    assert.equal(await fs.pathExists(p('templates/_modules/teaser/icon.svg')), true);
});

test('lässt unveränderte Dateien stehen und schreibt geänderte neu', async () => {
    await copyAll(tasks());
    const before = await fs.stat(p('templates/index.twig'));
    await write('src/macros/m.twig', 'geändert');
    await copyAll(tasks());
    const after = await fs.stat(p('templates/index.twig'));
    assert.equal(after.ino, before.ino);
    assert.equal(after.mtimeMs, before.mtimeMs);
    assert.equal(await fs.readFile(p('templates/_macros/m.twig'), 'utf8'), 'geändert');
});

test('eine zwischen glob und Kopieren gelöschte Quelle bricht den Durchgang nicht ab', async (t) => {
    const copy = fs.copy;
    t.mock.method(fs, 'copy', async (src, ...rest) => {
        if (src.endsWith('index.twig')) await fs.remove(src);
        return copy(src, ...rest);
    });
    await copyAll(tasks());
    assert.equal(await fs.pathExists(p('templates/news/entry.twig')), true);
    t.mock.restoreAll();
    await copyAll(tasks());
    assert.deepEqual((await fs.readdir(p('templates'))).sort(), ['_macros', '_modules', 'news']);
});

test('legt fehlende Ziele an, auch ohne Quelldateien', async () => {
    await fs.remove(p('src/macros'));
    await copyAll(tasks());
    assert.equal((await fs.stat(p('templates/_macros'))).isDirectory(), true);
});
