export type CharStatus = "pending" | "correct" | "incorrect";

export interface EngineStats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  elapsedSeconds: number;
}

/**
 * Cursor always advances on input (correct or not) so a mistake shows red
 * and can be fixed with backspace, rather than blocking further typing.
 */
export class TypingEngine {
  private target: string[];
  private statuses: CharStatus[];
  private cursor = 0;
  private startTime: number | null = null;
  private endTime: number | null = null;
  private correctKeystrokes = 0;
  private incorrectKeystrokes = 0;

  constructor(target: string) {
    this.target = [...target];
    this.statuses = this.target.map(() => "pending");
  }

  getTarget(): string[] {
    return this.target;
  }

  getStatuses(): CharStatus[] {
    return this.statuses;
  }

  getCursor(): number {
    return this.cursor;
  }

  hasStarted(): boolean {
    return this.startTime !== null;
  }

  isFinished(): boolean {
    return this.endTime !== null || this.cursor >= this.target.length;
  }

  /** Append more words to the target (used by time-mode as the buffer runs low). */
  extend(moreText: string): void {
    this.target.push(...moreText);
    this.statuses.push(...moreText.split("").map(() => "pending" as CharStatus));
  }

  type(char: string): void {
    if (this.isFinished()) return;
    if (this.startTime === null) this.startTime = Date.now();

    const expected = this.target[this.cursor];
    if (char === expected) {
      this.statuses[this.cursor] = "correct";
      this.correctKeystrokes++;
    } else {
      this.statuses[this.cursor] = "incorrect";
      this.incorrectKeystrokes++;
    }
    this.cursor++;

    if (this.cursor >= this.target.length) {
      this.finish();
    }
  }

  backspace(): void {
    if (this.cursor === 0 || this.isFinished()) return;
    this.cursor--;
    this.statuses[this.cursor] = "pending";
  }

  finish(): void {
    if (this.endTime !== null) return;
    this.endTime = Date.now();
  }

  /**
   * Stats as of `now` (ms epoch). Pass Date.now() for live updates, or
   * omit to use the locked endTime once the test has finished.
   */
  getStats(now?: number): EngineStats {
    if (this.startTime === null) {
      return { wpm: 0, rawWpm: 0, accuracy: 0, elapsedSeconds: 0 };
    }
    const end = this.endTime ?? now ?? Date.now();
    const elapsedSeconds = Math.max((end - this.startTime) / 1000, 0.001);
    const minutes = elapsedSeconds / 60;

    const correctChars = this.correctKeystrokes;
    const totalChars = this.correctKeystrokes + this.incorrectKeystrokes;

    const wpm = correctChars / 5 / minutes;
    const rawWpm = totalChars / 5 / minutes;
    const accuracy = totalChars === 0 ? 0 : (correctChars / totalChars) * 100;

    return {
      wpm: Math.max(0, Math.round(wpm * 10) / 10),
      rawWpm: Math.max(0, Math.round(rawWpm * 10) / 10),
      accuracy: Math.round(accuracy * 10) / 10,
      elapsedSeconds: Math.round(elapsedSeconds * 10) / 10,
    };
  }
}
