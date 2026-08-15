import { getStats, getResults, isLoggedIn, ApiError, type StatsResponse, type ResultResponse } from "../api";
import type { View } from "../main";

export function renderStatsView(container: HTMLElement, navigate: (v: View) => void): void {
  if (!isLoggedIn()) {
    container.innerHTML = `
      <div class="stats-view">
        <p class="empty-state">Log in to track your typing stats over time.</p>
        <button id="go-login" class="submit-btn">log in</button>
      </div>
    `;
    container.querySelector("#go-login")?.addEventListener("click", () => navigate("auth"));
    return;
  }

  container.innerHTML = `<div class="stats-view"><p class="loading">loading stats...</p></div>`;

  Promise.all([getStats(), getResults()])
    .then(([stats, results]) => renderLoaded(stats, results))
    .catch((err) => {
      container.innerHTML = `<div class="stats-view"><p class="auth-error">${
        err instanceof ApiError ? err.message : "Failed to load stats."
      }</p></div>`;
    });

  function renderLoaded(stats: StatsResponse, results: ResultResponse[]): void {
    const sorted = [...results].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    container.innerHTML = `
      <div class="stats-view">
        <div class="summary-cards">
          <div class="summary-card"><span class="summary-value">${round(stats.avg_wpm)}</span><span class="summary-label">avg wpm</span></div>
          <div class="summary-card"><span class="summary-value">${round(stats.best_wpm)}</span><span class="summary-label">best wpm</span></div>
          <div class="summary-card"><span class="summary-value">${round(stats.avg_accuracy)}%</span><span class="summary-label">avg accuracy</span></div>
          <div class="summary-card"><span class="summary-value">${stats.total_tests}</span><span class="summary-label">tests taken</span></div>
        </div>
        ${
          sorted.length === 0
            ? `<p class="empty-state">No tests yet — go type something!</p>`
            : `<table class="history-table">
                <thead><tr><th>date</th><th>wpm</th><th>accuracy</th><th>time</th></tr></thead>
                <tbody>
                  ${sorted
                    .map(
                      (r) => `
                    <tr>
                      <td>${formatDate(r.created_at)}</td>
                      <td>${round(r.wpm)}</td>
                      <td>${round(r.accuracy)}%</td>
                      <td>${round(r.duration)}s</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>`
        }
      </div>
    `;
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatDate(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
