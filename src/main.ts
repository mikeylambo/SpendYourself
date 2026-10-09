import { App } from "./ui/app.ts";
import { logError } from "./ui/meta.ts";

const app = new App(document.getElementById("app")!);
void app.boot();
if (new URLSearchParams(location.search).get("dev") === "1") (window as unknown as { app: App }).app = app;

// Offline play once installed. Skipped in dev; a host without sw.js simply rejects the registration.
if (import.meta.env.PROD && "serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => void navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

// Keep the last few uncaught errors for Settings → Report a problem.
addEventListener("error", (e) => logError(`${e.message} @ ${(e.filename ?? "").split("/").pop()}:${e.lineno}`));
addEventListener("unhandledrejection", (e) => logError(`unhandled: ${String((e.reason as Error)?.stack ?? e.reason).split("\n").slice(0, 2).join(" | ")}`));
