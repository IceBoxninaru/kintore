import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { computeE1RM } from "./e1rm.js";

export function createStore(dataDir) {
  const dbPath = path.join(dataDir, "sets.json");

  async function ensureStore() {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      await fs.access(dbPath);
    } catch {
      await fs.writeFile(dbPath, JSON.stringify({ sets: [] }, null, 2), "utf8");
    }
  }

  function normalizeSet(raw) {
    const id =
      typeof raw.id === "string" && raw.id.trim().length > 0
        ? raw.id.trim()
        : randomUUID();
    const exercise = String(raw.exercise || "").trim();
    const date = String(raw.date || "").trim();
    const weight = Number(raw.weight);
    const reps = Number(raw.reps);
    return {
      id,
      exercise,
      date,
      weight,
      reps,
      e1rm: computeE1RM(weight, reps)
    };
  }

  async function readSets() {
    await ensureStore();
    const txt = await fs.readFile(dbPath, "utf8");
    const json = JSON.parse(txt || "{}");
    const rawSets = Array.isArray(json.sets) ? json.sets : [];
    let mutated = false;
    const normalized = rawSets.map(raw => {
      const norm = normalizeSet(raw);
      if (
        raw.id !== norm.id ||
        raw.exercise !== norm.exercise ||
        raw.date !== norm.date ||
        Number(raw.weight) !== norm.weight ||
        Number(raw.reps) !== norm.reps ||
        Number(raw.e1rm) !== norm.e1rm
      ) {
        mutated = true;
      }
      return norm;
    });
    if (mutated) {
      await writeSets(normalized);
    }
    return normalized;
  }

  async function writeSets(sets) {
    await ensureStore();
    await fs.writeFile(dbPath, JSON.stringify({ sets }, null, 2), "utf8");
  }

  function aggregateDailyBest(sets) {
    const bestByDate = new Map();
    for (const set of sets) {
      const key = set.date;
      const current = bestByDate.get(key);
      const candidate = {
        date: key,
        exercise: set.exercise,
        weight: set.weight,
        reps: set.reps,
        e1rm: computeE1RM(set.weight, set.reps)
      };
      if (!current || candidate.e1rm > current.e1rm) {
        bestByDate.set(key, candidate);
      }
    }
    return Array.from(bestByDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  return {
    ensureStore,
    readSets,
    writeSets,
    normalizeSet,
    aggregateDailyBest
  };
}
