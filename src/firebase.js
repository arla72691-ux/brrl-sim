// ─── Firebase Realtime Database — REST only, no SDK needed ───────────────────
// All reads/writes use plain fetch() against the REST API.
// Database is in test mode (public read/write) for the session.

const DB = "https://brrl-sim-default-rtdb.firebaseio.com";

// ── Low-level helpers ─────────────────────────────────────────────────────────
async function fbGet(path) {
  try {
    const r = await fetch(`${DB}/${path}.json`);
    if (!r.ok) return null;
    const data = await r.json();
    return data;
  } catch { return null; }
}

async function fbSet(path, value) {
  try {
    const r = await fetch(`${DB}/${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    return r.ok;
  } catch { return false; }
}

async function fbPatch(path, value) {
  try {
    const r = await fetch(`${DB}/${path}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    return r.ok;
  } catch { return false; }
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
// Stored as an object keyed by player key (lowercased name)
// { "ash": { key:"ash", name:"Ash", part1:24, part2:null, total:24 }, ... }

export async function getLB() {
  const data = await fbGet("leaderboard");
  if (!data) return [];
  return Object.values(data).sort((a, b) => (b.total || 0) - (a.total || 0));
}

export async function savePart1(name, score) {
  const key = name.trim().toLowerCase().replace(/\s+/g, "_");
  const existing = await fbGet(`leaderboard/${key}`);
  const entry = {
    key,
    name: name.trim(),
    part1: score,
    part2: existing?.part2 ?? null,
    total: score + (existing?.part2 ?? 0),
  };
  await fbSet(`leaderboard/${key}`, entry);
  return getLB();
}

export async function savePart2(name, score) {
  const key = name.trim().toLowerCase().replace(/\s+/g, "_");
  const existing = await fbGet(`leaderboard/${key}`);
  const entry = {
    key,
    name: name.trim(),
    part1: existing?.part1 ?? null,
    part2: score,
    total: (existing?.part1 ?? 0) + score,
  };
  await fbSet(`leaderboard/${key}`, entry);
  return getLB();
}

export async function lookupPart1(name) {
  const key = name.trim().toLowerCase().replace(/\s+/g, "_");
  const entry = await fbGet(`leaderboard/${key}`);
  return entry?.part1 ?? null;
}

// ── Votes ─────────────────────────────────────────────────────────────────────
// Stored as: { "1A__ash": "B", "1B__ash": "A", ... }

export async function recordVote(scenKey, playerName, optId) {
  const key = `${scenKey}__${playerName.trim().toLowerCase().replace(/\s+/g, "_")}`;
  await fbPatch("votes", { [key]: optId });
}

export async function getVotes() {
  const data = await fbGet("votes");
  return data || {};
}

export async function clearSession() {
  await fbSet("leaderboard", null);
  await fbSet("votes", null);
}
