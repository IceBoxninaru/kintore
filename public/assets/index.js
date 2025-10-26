import { fetchJSON, formatNumber } from "./common.js";

const els = {
  healthStatus: document.getElementById("healthStatus"),
  healthMessage: document.getElementById("healthMessage"),
  btnHealth: document.getElementById("btnHealth"),
  exerciseSelect: document.getElementById("exerciseSelect"),
  exerciseCustom: document.getElementById("exerciseCustom"),
  date: document.getElementById("date"),
  weight: document.getElementById("weight"),
  reps: document.getElementById("reps"),
  logForm: document.getElementById("logForm"),
  logMessage: document.getElementById("logMessage"),
  filterExercise: document.getElementById("filterExercise"),
  btnRefresh: document.getElementById("btnRefresh"),
  historyMessage: document.getElementById("historyMessage"),
  historyContainer: document.getElementById("historyContainer"),
  targetExercise: document.getElementById("targetExercise"),
  step: document.getElementById("step"),
  targetForm: document.getElementById("targetForm"),
  targetMessage: document.getElementById("targetMessage"),
  targetResult: document.getElementById("targetResult")
};

const state = {
  exercises: [],
  allSets: [],
  logExercise: "\u30d9\u30f3\u30c1\u30d7\u30ec\u30b9",
  targetExercise: "\u30d9\u30f3\u30c1\u30d7\u30ec\u30b9",
  exerciseFilter: ""
};

function toggleCustomInput(show) {
  els.exerciseCustom.hidden = !show;
  if (show) {
    els.exerciseCustom.focus();
  } else {
    els.exerciseCustom.value = "";
  }
}

function updateSelectors() {
  const exercises = state.exercises.slice().sort();
  const logSelect = els.exerciseSelect;
  const filterSelect = els.filterExercise;
  const targetSelect = els.targetExercise;

  logSelect.innerHTML =
    exercises.map(ex => `<option value="${ex}">${ex}</option>`).join("") +
    `<option value="__custom__">その他（手入力）</option>`;

  filterSelect.innerHTML =
    `<option value="">すべて</option>` +
    exercises.map(ex => `<option value="${ex}">${ex}</option>`).join("");

  targetSelect.innerHTML = exercises.map(
    ex => `<option value="${ex}">${ex}</option>`
  ).join("");

  if (state.logExercise && exercises.includes(state.logExercise)) {
    logSelect.value = state.logExercise;
    toggleCustomInput(false);
  } else if (state.logExercise) {
    logSelect.value = "__custom__";
    els.exerciseCustom.value = state.logExercise;
    toggleCustomInput(true);
  } else if (exercises.length > 0) {
    logSelect.value = exercises[0];
    state.logExercise = exercises[0];
    toggleCustomInput(false);
  } else {
    logSelect.value = "__custom__";
    toggleCustomInput(true);
  }

  if (state.exerciseFilter && exercises.includes(state.exerciseFilter)) {
    filterSelect.value = state.exerciseFilter;
  } else {
    state.exerciseFilter = "";
    filterSelect.value = "";
  }

  if (state.targetExercise && exercises.includes(state.targetExercise)) {
    targetSelect.value = state.targetExercise;
  } else if (exercises.length > 0) {
    targetSelect.value = exercises[0];
    state.targetExercise = exercises[0];
  } else {
    targetSelect.value = "";
    state.targetExercise = "";
  }
}

async function loadExercises() {
  try {
    const resp = await fetchJSON("/api/exercises");
    if (resp.ok) {
      state.exercises = resp.exercises || [];
      updateSelectors();
    }
  } catch {
    // keep previous state
  }
}

function renderHistory() {
  const container = els.historyContainer;
  const filter = state.exerciseFilter;
  const sets = filter
    ? state.allSets.filter(s => s.exercise === filter)
    : state.allSets.slice();
  sets.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  if (sets.length === 0) {
    container.className = "empty-state";
    container.textContent = filter
      ? "該当する記録がありません。"
      : "まだ記録がありません。";
    return;
  }

  const rows = sets
    .map(
      set => `
      <tr data-id="${set.id}">
        <td>${set.date}</td>
        <td>${set.exercise}</td>
        <td>${formatNumber(set.weight)} kg</td>
        <td>${set.reps} 回</td>
        <td>${formatNumber(set.e1rm)}</td>
        <td><button type="button" class="danger btn-delete" data-id="${set.id}">削除</button></td>
      </tr>`
    )
    .join("");

  container.className = "";
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>日付</th>
          <th>種目</th>
          <th>重量</th>
          <th>回数</th>
          <th>推定1RM</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  container.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", handleDeleteClick);
  });
}

async function loadSets() {
  try {
    const resp = await fetchJSON("/api/sets");
    if (resp.ok) {
      state.allSets = resp.sets || [];
      renderHistory();
    }
  } catch {
    els.historyContainer.className = "empty-state";
    els.historyContainer.textContent = "履歴の取得に失敗しました。";
  }
}

function renderHealth(ok) {
  if (ok) {
    els.healthStatus.textContent = "稼働中";
    els.healthStatus.className = "status-badge ok";
    els.healthMessage.textContent = "API サーバーに接続できました。";
  } else {
    els.healthStatus.textContent = "停止中";
    els.healthStatus.className = "status-badge ng";
    els.healthMessage.textContent = "サーバーに接続できません。コンテナを確認してください。";
  }
}

async function checkHealth() {
  try {
    const data = await fetchJSON("/api/health");
    renderHealth(Boolean(data.ok));
  } catch {
    renderHealth(false);
  }
}

function getSelectedExercise() {
  if (els.exerciseSelect.value === "__custom__") {
    return els.exerciseCustom.value.trim();
  }
  return els.exerciseSelect.value.trim();
}

async function handleDeleteClick(event) {
  const button = event.currentTarget;
  const id = button.dataset.id;
  if (!id) return;
  if (!window.confirm("この記録を削除しますか？")) return;

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "削除中...";
  els.historyMessage.textContent = "";
  els.historyMessage.classList.remove("error");

  try {
    const resp = await fetchJSON(`/api/sets/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    if (!resp.ok) throw new Error("delete_failed");
    els.historyMessage.textContent = "記録を削除しました。";
    await loadExercises();
    await loadSets();
    await loadTarget();
  } catch {
    button.disabled = false;
    button.textContent = originalLabel;
    els.historyMessage.textContent = "削除に失敗しました。";
    els.historyMessage.classList.add("error");
  }
}

async function loadTarget() {
  const exercise =
    els.targetExercise.value ||
    state.targetExercise ||
    state.exerciseFilter ||
    state.logExercise;

  if (!exercise) {
    els.targetResult.innerHTML = "";
    els.targetMessage.textContent = "種目を選択してください。";
    els.targetMessage.classList.add("error");
    return;
  }

  els.targetMessage.textContent = "計算中...";
  els.targetMessage.classList.remove("error");

  try {
    const data = await fetchJSON(
      `/api/next-target?exercise=${encodeURIComponent(exercise)}&step=${encodeURIComponent(
        Number(els.step.value || 1)
      )}`
    );

    if (data.status === "NO_HISTORY") {
      els.targetMessage.textContent = "";
      els.targetResult.innerHTML = `
        <div class="target-box">
          <strong>まだ履歴がありません。</strong>
          <span>先に基準となるセットを記録しましょう。</span>
        </div>
      `;
      return;
    }

    if (data.status === "NOT_ALLOWED") {
      els.targetMessage.textContent = "";
      els.targetResult.innerHTML = `
        <div class="target-box">
          <strong>まだ休息が必要です。</strong>
          <span>次に挑戦できる日: <b>${data.earliestNextDate}</b></span>
          <span>おすすめ代替案: <b>${formatNumber(data.alt.weight)} kg × ${data.alt.reps} 回</b> (推定1RM ${formatNumber(data.alt.e1rm)})</span>
          <span>直近ベスト: ${data.lastTop.date} / ${formatNumber(data.lastTop.weight)} kg × ${data.lastTop.reps} 回</span>
        </div>
      `;
      return;
    }

    if (data.status === "ALLOWED") {
      els.targetMessage.textContent = "";
      els.targetResult.innerHTML = `
        <div class="target-box">
          <strong>新しいチャレンジが可能です！</strong>
          <span>推奨重量: <b>${formatNumber(data.target.weight)} kg × ${data.target.reps} 回</b></span>
          <span>直近ベスト: ${data.lastTop.date} / ${formatNumber(data.lastTop.weight)} kg × ${data.lastTop.reps} 回 (推定1RM ${formatNumber(data.lastTop.e1rm)})</span>
        </div>
      `;
      return;
    }

    els.targetMessage.textContent = "結果の解釈に失敗しました。";
    els.targetMessage.classList.add("error");
    els.targetResult.innerHTML = "";
  } catch {
    els.targetMessage.textContent = "目標の取得に失敗しました。";
    els.targetMessage.classList.add("error");
    els.targetResult.innerHTML = "";
  }
}

function initListeners() {
  els.btnHealth.addEventListener("click", checkHealth);

  els.exerciseSelect.addEventListener("change", event => {
    if (event.target.value === "__custom__") {
      toggleCustomInput(true);
      state.logExercise = els.exerciseCustom.value.trim();
    } else {
      toggleCustomInput(false);
      state.logExercise = event.target.value;
    }
  });

  els.exerciseCustom.addEventListener("input", event => {
    state.logExercise = event.target.value.trim();
  });

  els.filterExercise.addEventListener("change", event => {
    state.exerciseFilter = event.target.value;
    renderHistory();
  });

  els.targetExercise.addEventListener("change", event => {
    state.targetExercise = event.target.value;
  });

  els.btnRefresh.addEventListener("click", async () => {
    els.historyContainer.className = "empty-state";
    els.historyContainer.textContent = "読込中...";
    await loadSets();
  });

  els.logForm.addEventListener("submit", async event => {
    event.preventDefault();
    const message = els.logMessage;
    const exercise = getSelectedExercise();
    if (!exercise) {
      message.textContent = "種目名を入力してください。";
      message.classList.add("error");
      return;
    }

    const payload = {
      exercise,
      date: els.date.value,
      weight: Number(els.weight.value),
      reps: Number(els.reps.value)
    };

    message.textContent = "送信中...";
    message.classList.remove("error");

    try {
      const resp = await fetchJSON("/api/sets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(resp.error || "invalid_body");

      message.textContent = `${resp.entry.exercise} を ${resp.entry.date} に記録しました。推定1RM: ${formatNumber(resp.entry.e1rm)}`;
      state.exerciseFilter = resp.entry.exercise;
      state.logExercise = resp.entry.exercise;
      state.targetExercise = resp.entry.exercise;

      await loadExercises();
      await loadSets();
      await loadTarget();
    } catch {
      message.textContent = "記録に失敗しました。入力内容を確認してください。";
      message.classList.add("error");
    }
  });

  els.targetForm.addEventListener("submit", event => {
    event.preventDefault();
    loadTarget();
  });
}

async function init() {
  els.date.value = new Date().toISOString().slice(0, 10);
  initListeners();
  await loadExercises();
  await loadSets();
  await loadTarget();
  checkHealth();
}

init();
