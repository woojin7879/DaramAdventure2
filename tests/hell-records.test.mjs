import test from 'node:test';
import assert from 'node:assert/strict';
import { recordHellRun, migrateHellRecord, HELL_HISTORY_LIMIT } from '../src/hell-records.js';
import { resultDetails } from '../src/results.js';
import { Game } from '../src/game.js';

const report = (time, kills, bosses, level = 10) => ({ time, kills, level, hellBossKills: Array.from({ length: bosses }, (_, i) => ({ year: i % 3 + 1, time: (i + 1) * 600 })) });

test('hell best record is one whole run, not a blend of maxima', () => {
  let state = { best: null, runs: [] };
  let out = recordHellRun(state, report(2400, 900, 2), '2026-09-15T00:00:00Z');
  assert.equal(out.isRecord, true);
  state = out;
  out = recordHellRun(state, report(1200, 1500, 4), '2026-09-15T01:00:00Z');
  assert.equal(out.isRecord, false);
  assert.deepEqual([out.best.time, out.best.kills, out.best.bosses], [2400, 900, 2], 'shorter run with more kills does not overwrite the longest run');
  assert.equal(out.runs.length, 2);
  assert.equal(out.runs[0].time, 1200, 'newest first');
  out = recordHellRun(out, report(2401, 10, 0), '2026-09-15T02:00:00Z', 'quit');
  assert.equal(out.isRecord, true);
  assert.equal(out.best.reason, 'quit', 'surrendering still counts as an ended attempt');
});

test('history keeps the most recent runs only', () => {
  let state = { best: null, runs: [] };
  for (let i = 0; i < HELL_HISTORY_LIMIT + 3; i++) state = recordHellRun(state, report(100 + i, i, 0), `2026-09-15T00:${String(i).padStart(2, '0')}:00Z`);
  assert.equal(state.runs.length, HELL_HISTORY_LIMIT);
  assert.equal(state.runs[0].time, 100 + HELL_HISTORY_LIMIT + 2);
  assert.equal(state.best.time, 100 + HELL_HISTORY_LIMIT + 2);
});

test('legacy blended record migrates as the best run and empty legacy stays null', () => {
  assert.equal(migrateHellRecord(null), null);
  assert.equal(migrateHellRecord({}), null);
  const best = migrateHellRecord({ time: 900, kills: 300, bosses: 1 });
  assert.deepEqual([best.time, best.kills, best.bosses], [900, 300, 1]);
  const out = recordHellRun({ best, runs: [] }, report(800, 1000, 3), '2026-09-15T00:00:00Z');
  assert.equal(out.isRecord, false);
  assert.equal(out.best.time, 900);
});

test('hell result board shows the new-record badge, best time and recent runs with outcome', () => {
  const g = new Game(); g.start(false, null, 1, 'hell'); g.time = 1500; g.kills = 400;
  const rep = g.report();
  const first = recordHellRun({ best: null, runs: [] }, rep, '2026-09-15T00:00:00Z');
  const html = resultDetails(rep, first);
  assert.match(html, /new-record/);
  assert.match(html, /최근 도전 1회/);
  assert.match(html, /이번 도전/);
  assert.match(html, /사망/);
  const quitState = recordHellRun({ best: { ...first.best, time: 3000 }, runs: first.runs }, rep, '2026-09-15T01:00:00Z', 'quit');
  const html2 = resultDetails(rep, quitState);
  assert.doesNotMatch(html2, /new-record/);
  assert.match(html2, /최고 기록 50:00/);
  assert.match(html2, /포기/);
  assert.doesNotMatch(resultDetails(rep, null), /최근 도전/);
});
