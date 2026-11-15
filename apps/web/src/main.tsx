import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { AppErrorBoundary } from "./components/feedback/AppErrorBoundary.js";
import { reportError } from "./lib/report-error.js";
import "./index.css";

// Global uncaught error listener
window.addEventListener("error", (event) => {
  reportError(event.error || event.message, { context: "window.onerror" });
});

// Global unhandled promise rejection listener
window.addEventListener("unhandledrejection", (event) => {
  reportError(event.reason, { context: "window.onunhandledrejection" });
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find root DOM element");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
