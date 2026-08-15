import { isLoggedIn, getUsername, logout } from "../api";
import type { View } from "../main";

export function renderNav(el: HTMLElement, active: View, navigate: (v: View) => void): void {
  const loggedIn = isLoggedIn();
  el.innerHTML = `
    <div class="nav">
      <div class="brand">speed<span>type</span></div>
      <nav class="nav-links">
        <button data-view="test" class="nav-btn ${active === "test" ? "active" : ""}">test</button>
        <button data-view="stats" class="nav-btn ${active === "stats" ? "active" : ""}">stats</button>
      </nav>
      <div class="nav-auth">
        ${
          loggedIn
            ? `<span class="username">${escapeHtml(getUsername() ?? "")}</span><button id="logout-btn" class="nav-btn">log out</button>`
            : `<button data-view="auth" class="nav-btn ${active === "auth" ? "active" : ""}">log in</button>`
        }
      </div>
    </div>
  `;

  el.querySelectorAll<HTMLButtonElement>("button[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.view as View));
  });

  el.querySelector<HTMLButtonElement>("#logout-btn")?.addEventListener("click", () => {
    logout();
    navigate("test");
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
