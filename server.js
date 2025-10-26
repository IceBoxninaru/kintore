import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createStore } from "./lib/store.js";
import { computeE1RM } from "./lib/e1rm.js";
import { defaultExercises } from "./lib/exercises.js";
import { parseISO, fmtISO, addDays } from "./lib/dates.js";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "data");
const { readSets, writeSets, normalizeSet, aggregateDailyBest } =
  createStore(dataDir);

function roundToStep(value, step = 1) {
  return Math.round(value / step) * step;
}

app.use("/", express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/exercises", async (_req, res) => {
  try {
    const sets = await readSets();
    const names = new Set(defaultExercises);
    for (const set of sets) {
      if (set.exercise) names.add(set.exercise);
    }
    res.json({ ok: true, exercises: Array.from(names).sort() });
  } catch (error) {
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

app.get("/api/sets", async (req, res) => {
  try {
    const exercise = String(req.query.exercise || "").trim();
    const sets = await readSets();
    const filtered = exercise
      ? sets.filter(s => s.exercise === exercise)
      : sets.slice();
    filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    res.json({ ok: true, sets: filtered });
  } catch (error) {
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

app.post("/api/sets", async (req, res) => {
  try {
    const { exercise, date, weight, reps } = req.body || {};
    if (!exercise || !date || !Number.isFinite(weight) || !Number.isFinite(reps)) {
      return res.status(400).json({ ok: false, error: "invalid_body" });
    }

    const sets = await readSets();
    const entry = normalizeSet({
      exercise: String(exercise),
      date: String(date),
      weight,
      reps
    });
    sets.push(entry);
    await writeSets(sets);

    res.json({ ok: true, entry });
  } catch (error) {
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

app.delete("/api/sets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ ok: false, error: "id_required" });

    const sets = await readSets();
    const nextSets = sets.filter(set => set.id !== id);
    if (nextSets.length === sets.length) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }
    await writeSets(nextSets);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

app.get("/api/progress", async (req, res) => {
  try {
    const exercise = String(req.query.exercise || "").trim();
    if (!exercise) return res.status(400).json({ ok: false, error: "exercise_required" });

    const sets = await readSets();
    const filtered = sets
      .filter(s => s.exercise === exercise)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    if (filtered.length === 0) {
      return res.json({ ok: true, series: [] });
    }

    const series = aggregateDailyBest(filtered);
    res.json({
      ok: true,
      exercise,
      totalSessions: filtered.length,
      series
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

app.get("/api/next-target", async (req, res) => {
  try {
    const exercise = String(req.query.exercise || "").trim();
    if (!exercise) return res.status(400).json({ ok: false, error: "exercise_required" });

    const step = Number(req.query.step || 1);
    const sets = await readSets();
    const filtered = sets
      .filter(s => s.exercise === exercise)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    if (filtered.length === 0) {
      return res.json({ status: "NO_HISTORY", suggestion: "log_a_baseline_set" });
    }

    const lastTop = filtered[0];
    const lastDate = parseISO(lastTop.date);
    const earliestNextDate = addDays(lastDate, 2);
    const todayUtc = parseISO(fmtISO(new Date()));
    const locked = todayUtc.getTime() < earliestNextDate.getTime();

    const altWeight = roundToStep(lastTop.weight * 0.9, step);
    const altReps = 5;
    const alt = {
      weight: altWeight,
      reps: altReps,
      e1rm: computeE1RM(altWeight, altReps)
    };

    if (locked) {
      return res.json({
        status: "NOT_ALLOWED",
        earliestNextDate: fmtISO(earliestNextDate),
        alt,
        lastTop
      });
    }

    const targetWeight = roundToStep(lastTop.weight * 1.025, step);
    const target = {
      weight: targetWeight,
      reps: lastTop.reps,
      e1rm: computeE1RM(targetWeight, lastTop.reps)
    };

    return res.json({
      status: "ALLOWED",
      target,
      lastTop
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
