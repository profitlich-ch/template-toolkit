import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'timers/promises';
import { coalesce } from './coalesce.js';

test('Auslöser kurz nacheinander ergeben einen Durchlauf', async () => {
    let runs = 0;
    const trigger = coalesce(async () => { runs++; }, 10);
    trigger();
    trigger();
    trigger();
    await sleep(40);
    assert.equal(runs, 1);
});

test('ein Auslöser während eines Durchlaufs hängt genau einen weiteren an', async () => {
    let runs = 0;
    let release;
    const trigger = coalesce(async () => {
        runs++;
        if (runs === 1) await new Promise(resolve => { release = resolve; });
    }, 10);

    trigger();
    await sleep(30);
    assert.equal(runs, 1);

    trigger();
    await sleep(30);
    trigger();
    await sleep(30);
    assert.equal(runs, 1, 'kein zweiter Durchlauf parallel zum ersten');

    release();
    await sleep(30);
    assert.equal(runs, 2);
});

test('ein Fehler im Durchlauf hält spätere Durchläufe nicht auf', async (t) => {
    t.mock.method(console, 'error', () => {});
    let runs = 0;
    const trigger = coalesce(async () => {
        runs++;
        throw new Error('kaputt');
    }, 10);
    trigger();
    await sleep(30);
    trigger();
    await sleep(30);
    assert.equal(runs, 2);
});
