import { TypingEngine, type EngineStats } from "../typingEngine";
import { generateWords } from "../wordList";
import { isLoggedIn, submitResult } from "../api";

type Mode = "time" | "words";

const TIME_OPTIONS = [15, 30, 60];
const WORD_OPTIONS = [10, 25, 50];
const EXTEND_THRESHOLD = 30;
const EXTEND_WORD_COUNT = 15;
const INITIAL_TIME_BUFFER_WORDS = 60;

export function renderTestView(container: HTMLElement): void {
  let mode: Mode = "time";
  let timeOption = 30;
  let wordOption = 25;
  let finished = false;
  let timerId: number | null = null;
  let engine: TypingEngine;

  container.innerHTML = `
    <div class="test-view">
      <div class="mode-bar">
        <div class="mode-group" id="mode-group">
          <button data-mode="time" class="mode-btn active">time</button>
          <button data-mode="words" class="mode-btn">words</button>
        </div>
        <div class="option-group" id="option-group"></div>
      </div>
      <div class="stats-row">
        <span class="stat-time" id="stat-time">30</span>
        <span class="stat-wpm" id="stat-wpm"></span>
      </div>
      <div class="text-display" id="text-display"></div>
      <input
        id="capture-input"
        class="capture-input"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
      />
      <div class="test-footer">
        <button id="restart-btn" class="restart-btn" title="restart (tab)">restart</button>
      </div>
      <div class="results-panel hidden" id="results-panel"></div>
    </div>
  `;

  const modeGroup = container.querySelector<HTMLElement>("#mode-group")!;
  const optionGroup = container.querySelector<HTMLElement>("#option-group")!;
  const statTime = container.querySelector<HTMLElement>("#stat-time")!;
  const statWpm = container.querySelector<HTMLElement>("#stat-wpm")!;
  const textDisplay = container.querySelector<HTMLElement>("#text-display")!;
  const input = container.querySelector<HTMLInputElement>("#capture-input")!;
  const restartBtn = container.querySelector<HTMLButtonElement>("#restart-btn")!;
  const resultsPanel = container.querySelector<HTMLElement>("#results-panel")!;

  function renderOptions(): void {
    const options = mode === "time" ? TIME_OPTIONS : WORD_OPTIONS;
    const current = mode === "time" ? timeOption : wordOption;
    optionGroup.innerHTML = options
      .map(
        (o) =>
          `<button data-option="${o}" class="option-btn ${o === current ? "active" : ""}">${o}</button>`,
      )
      .join("");
    optionGroup.querySelectorAll<HTMLButtonElement>("button[data-option]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = Number(btn.dataset.option);
        if (mode === "time") timeOption = val;
        else wordOption = val;
        renderOptions();
        restart();
      });
    });
  }

  modeGroup.querySelectorAll<HTMLButtonElement>("button[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode as Mode;
      modeGroup.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      renderOptions();
      restart();
    });
  });

  function newTargetText(): string {
    return mode === "time" ? generateWords(INITIAL_TIME_BUFFER_WORDS) : generateWords(wordOption);
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderText(): void {
    const target = engine.getTarget();
    const statuses = engine.getStatuses();
    const cursor = engine.getCursor();
    let html = "";
    for (let i = 0; i < target.length; i++) {
      const ch = target[i] === " " ? "&nbsp;" : escapeHtml(target[i]);
      const cls = statuses[i];
      const cursorCls = i === cursor ? " cursor" : "";
      html += `<span class="char ${cls}${cursorCls}">${ch}</span>`;
    }
    textDisplay.innerHTML = html;
    const cursorEl = textDisplay.querySelector(".cursor");
    cursorEl?.scrollIntoView({ block: "nearest" });
  }

  function updateStatDisplay(stats: EngineStats): void {
    if (!engine.hasStarted()) {
      statTime.textContent = mode === "time" ? String(timeOption) : "0.0s";
      statWpm.textContent = "";
      return;
    }
    if (mode === "time") {
      const remaining = Math.max(timeOption - stats.elapsedSeconds, 0);
      statTime.textContent = String(Math.ceil(remaining));
    } else {
      statTime.textContent = `${stats.elapsedSeconds.toFixed(1)}s`;
    }
    statWpm.textContent = `${stats.wpm} wpm`;
  }

  function startTimer(): void {
    if (timerId !== null) return;
    timerId = window.setInterval(() => {
      const stats = engine.getStats(Date.now());
      updateStatDisplay(stats);
      if (mode === "time" && timeOption - stats.elapsedSeconds <= 0) {
        engine.finish();
        onFinish();
      }
    }, 100);
  }

  function stopTimer(): void {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function handleType(char: string): void {
    const wasStarted = engine.hasStarted();
    engine.type(char);
    if (!wasStarted && engine.hasStarted()) {
      startTimer();
    }
    if (mode === "time" && engine.getTarget().length - engine.getCursor() < EXTEND_THRESHOLD) {
      engine.extend(" " + generateWords(EXTEND_WORD_COUNT));
    }
    renderText();
    updateStatDisplay(engine.getStats(Date.now()));
    if (engine.isFinished()) {
      onFinish();
    }
  }

  function onFinish(): void {
    if (finished) return;
    finished = true;
    stopTimer();
    engine.finish();
    const stats = engine.getStats();
    input.blur();
    showResults(stats);
  }

  function showResults(stats: EngineStats): void {
    resultsPanel.classList.remove("hidden");
    resultsPanel.innerHTML = `
      <div class="results-grid">
        <div class="result-item"><span class="result-value">${stats.wpm}</span><span class="result-label">wpm</span></div>
        <div class="result-item"><span class="result-value">${stats.accuracy}%</span><span class="result-label">accuracy</span></div>
        <div class="result-item"><span class="result-value">${stats.rawWpm}</span><span class="result-label">raw</span></div>
        <div class="result-item"><span class="result-value">${stats.elapsedSeconds}s</span><span class="result-label">time</span></div>
      </div>
      <p class="results-status" id="results-status">
        ${isLoggedIn() ? "saving..." : "log in to save your results"}
      </p>
      <button id="results-restart" class="restart-btn">next test</button>
    `;
    resultsPanel.querySelector("#results-restart")?.addEventListener("click", restart);

    if (isLoggedIn() && stats.elapsedSeconds > 0) {
      const statusEl = resultsPanel.querySelector<HTMLElement>("#results-status")!;
      submitResult({ wpm: stats.wpm, accuracy: stats.accuracy, duration: stats.elapsedSeconds })
        .then(() => {
          statusEl.textContent = "saved to your stats";
        })
        .catch(() => {
          statusEl.textContent = "couldn't save this result";
        });
    }
  }

  function focusInput(): void {
    input.focus();
  }

  function restart(): void {
    finished = false;
    stopTimer();
    engine = new TypingEngine(newTargetText());
    resultsPanel.classList.add("hidden");
    resultsPanel.innerHTML = "";
    input.value = "";
    renderText();
    updateStatDisplay(engine.getStats());
    focusInput();
  }

  textDisplay.addEventListener("click", focusInput);
  restartBtn.addEventListener("click", restart);

  input.addEventListener("keydown", (e) => {
    if (finished || e.ctrlKey || e.metaKey || e.altKey) {
      if (e.key === "Tab") {
        e.preventDefault();
        restart();
      }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      restart();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      engine.backspace();
      renderText();
      updateStatDisplay(engine.getStats(Date.now()));
      return;
    }
    if (e.key === " " || e.key.length === 1) {
      e.preventDefault();
      handleType(e.key);
    }
  });

  ["copy", "paste", "cut"].forEach((evt) => {
    input.addEventListener(evt, (e) => e.preventDefault());
  });

  renderOptions();
  restart();
}
