import { fetchJSON, formatNumber } from "./common.js";

const els = {
  exerciseSelect: document.getElementById("exerciseSelect"),
  chartMessage: document.getElementById("chartMessage"),
  tableContainer: document.getElementById("tableContainer"),
  summary: document.getElementById("summary")
};

let chart;

function destroyChart() {
  if (chart) {
    chart.destroy();
    chart = null;
  }
}

function renderChart(series, exercise) {
  const ctx = document.getElementById("progressChart").getContext("2d");
  destroyChart();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.map(point => point.date),
      datasets: [
        {
          label: `${exercise} 推定1RM`,
          data: series.map(point => point.e1rm),
          fill: false,
          tension: 0.25,
          borderColor: "rgba(76, 110, 245, 0.9)",
          backgroundColor: "rgba(76, 110, 245, 0.35)",
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: "推定1RM (kg)" }
        },
        x: { title: { display: true, text: "日付" } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label(context) {
              const point = series[context.dataIndex];
              return ` 推定1RM ${formatNumber(point.e1rm, 2)}kg (重量 ${formatNumber(
                point.weight,
                1
              )}kg × ${point.reps}回)`;
            }
          }
        }
      }
    }
  });
}

function renderSummary(series, totalSessions) {
  if (series.length === 0) {
    els.summary.innerHTML = "";
    return;
  }
  const first = series[0];
  const last = series[series.length - 1];
  const delta = last.e1rm - first.e1rm;
  els.summary.innerHTML = `
    <span>記録日数: <strong>${series.length}</strong></span>
    <span>総セット数: <strong>${totalSessions}</strong></span>
    <span>初回1RM: <strong>${formatNumber(first.e1rm, 2)}kg</strong></span>
    <span>最新1RM: <strong>${formatNumber(last.e1rm, 2)}kg</strong></span>
    <span>変化量: <strong>${delta >= 0 ? "+" : ""}${formatNumber(delta, 2)}kg</strong></span>
  `;
}

function renderTable(series) {
  if (series.length === 0) {
    els.tableContainer.className = "message";
    els.tableContainer.textContent = "まだ記録がありません。";
    return;
  }
  const rows = series
    .map(
      point => `
      <tr>
        <td>${point.date}</td>
        <td>${formatNumber(point.weight, 1)} kg</td>
        <td>${point.reps} 回</td>
        <td>${formatNumber(point.e1rm, 2)} kg</td>
      </tr>`
    )
    .join("");
  els.tableContainer.className = "";
  els.tableContainer.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>日付</th>
          <th>重量</th>
          <th>回数</th>
          <th>推定1RM</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function loadProgress(exercise) {
  els.chartMessage.textContent = "読込中...";
  els.chartMessage.classList.remove("error");
  els.tableContainer.className = "message";
  els.tableContainer.textContent = "読込中...";

  try {
    const data = await fetchJSON(
      `/api/progress?exercise=${encodeURIComponent(exercise)}`
    );
    if (!data.ok) throw new Error(data.error || "progress_error");
    const series = data.series || [];
    if (series.length === 0) {
      destroyChart();
      els.chartMessage.textContent = "この種目の記録がまだありません。";
      renderSummary([], data.totalSessions || 0);
      renderTable([]);
      return;
    }
    els.chartMessage.textContent = "";
    renderChart(series, exercise);
    renderSummary(series, data.totalSessions || series.length);
    renderTable(series);
  } catch {
    destroyChart();
    els.chartMessage.textContent = "データの取得に失敗しました。";
    els.chartMessage.classList.add("error");
    els.tableContainer.className = "message";
    els.tableContainer.textContent = "データの取得に失敗しました。";
  }
}

async function loadExercises() {
  els.exerciseSelect.disabled = true;
  try {
    const resp = await fetchJSON("/api/exercises");
    const exercises = resp.ok ? resp.exercises || [] : [];
    if (exercises.length === 0) {
      els.exerciseSelect.innerHTML = "<option>データなし</option>";
      els.chartMessage.textContent = "まずは記録画面でセットを登録してください。";
      els.tableContainer.textContent = "データがありません。";
      els.exerciseSelect.disabled = true;
      return;
    }
    els.exerciseSelect.innerHTML = exercises
      .map(ex => `<option value="${ex}">${ex}</option>`)
      .join("");
    els.exerciseSelect.disabled = false;
    await loadProgress(els.exerciseSelect.value);
  } catch {
    els.exerciseSelect.innerHTML = "<option>読み込みエラー</option>";
    els.exerciseSelect.disabled = true;
    els.chartMessage.textContent = "種目リストの取得に失敗しました。";
    els.chartMessage.classList.add("error");
  }
}

els.exerciseSelect.addEventListener("change", event => {
  const value = event.target.value;
  if (value) loadProgress(value);
});

loadExercises();
