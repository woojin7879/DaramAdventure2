// Hell mode is a record chase: every ended run (death or surrender) is one entry.
// The best record is a single whole run (the longest survival), never a blend of
// the best time from one run and the most kills from another.
export const HELL_HISTORY_LIMIT = 10;

export const hellEntry = (report, endedAt, reason = "dead") => ({
  time: report.time,
  kills: report.kills,
  bosses: (report.hellBossKills || []).length,
  level: report.level,
  reason,
  endedAt,
});

// Returns the new storage state plus whether this run became the best record.
export function recordHellRun(previous, report, endedAt = new Date().toISOString(), reason = "dead") {
  const entry = hellEntry(report, endedAt, reason);
  const best = previous.best;
  const isRecord = !best || entry.time > best.time;
  const runs = [entry, ...(previous.runs || [])].slice(0, HELL_HISTORY_LIMIT);
  return { best: isRecord ? entry : best, runs, isRecord, entry };
}

// Legacy `hellRecord` blended independent maxima; treat it as the best run.
export const migrateHellRecord = (legacy) =>
  legacy && legacy.time > 0 ? { time: legacy.time, kills: legacy.kills || 0, bosses: legacy.bosses || 0, level: legacy.level, reason: "dead", endedAt: legacy.endedAt || null } : null;
