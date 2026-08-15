import { register, login, ApiError } from "../api";
import type { View } from "../main";

export function renderAuthView(container: HTMLElement, navigate: (v: View) => void): void {
  let mode: "login" | "register" = "login";

  function render(): void {
    container.innerHTML = `
      <div class="auth-view">
        <div class="auth-tabs">
          <button data-tab="login" class="mode-btn ${mode === "login" ? "active" : ""}">log in</button>
          <button data-tab="register" class="mode-btn ${mode === "register" ? "active" : ""}">register</button>
        </div>
        <form id="auth-form" class="auth-form">
          ${mode === "register" ? `<label>email<input type="email" id="email" required /></label>` : ""}
          <label>username<input type="text" id="username" required minlength="3" maxlength="30" autocomplete="username" /></label>
          <label>password<input type="password" id="password" required minlength="8" maxlength="72" autocomplete="${mode === "login" ? "current-password" : "new-password"}" /></label>
          <button type="submit" class="submit-btn">${mode === "login" ? "log in" : "create account"}</button>
        </form>
        <p class="auth-error hidden" id="auth-error"></p>
      </div>
    `;

    container.querySelectorAll<HTMLButtonElement>("button[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.dataset.tab as "login" | "register";
        render();
      });
    });

    const form = container.querySelector<HTMLFormElement>("#auth-form")!;
    const errorEl = container.querySelector<HTMLElement>("#auth-error")!;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      const username = (container.querySelector("#username") as HTMLInputElement).value;
      const password = (container.querySelector("#password") as HTMLInputElement).value;
      const submitBtn = form.querySelector<HTMLButtonElement>(".submit-btn")!;
      submitBtn.disabled = true;
      try {
        if (mode === "register") {
          const email = (container.querySelector("#email") as HTMLInputElement).value;
          await register(username, email, password);
        }
        await login(username, password);
        navigate("test");
      } catch (err) {
        errorEl.textContent = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        errorEl.classList.remove("hidden");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  render();
}
