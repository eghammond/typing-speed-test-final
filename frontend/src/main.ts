import "./style.css";
import { renderNav } from "./ui/nav";
import { renderTestView } from "./ui/testView";
import { renderAuthView } from "./ui/authView";
import { renderStatsView } from "./ui/statsView";

export type View = "test" | "stats" | "auth";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="app-shell">
    <header id="nav"></header>
    <main id="view"></main>
  </div>
`;

const navEl = document.querySelector<HTMLElement>("#nav")!;
const viewEl = document.querySelector<HTMLElement>("#view")!;

function navigate(view: View): void {
  renderNav(navEl, view, navigate);
  viewEl.innerHTML = "";
  if (view === "test") renderTestView(viewEl);
  else if (view === "stats") renderStatsView(viewEl, navigate);
  else renderAuthView(viewEl, navigate);
}

navigate("test");
