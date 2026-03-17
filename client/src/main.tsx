import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply saved theme before first render to prevent flash
(function initTheme() {
  const stored = localStorage.getItem("localticket_theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = stored === "dark" || ((!stored || stored === "system") && prefersDark);
  if (isDark) document.documentElement.classList.add("dark");
})();

createRoot(document.getElementById("root")!).render(<App />);
