import { App } from "./ui/app.ts";

const app = new App(document.getElementById("app")!);
void app.boot();
if (new URLSearchParams(location.search).get("dev") === "1") (window as unknown as { app: App }).app = app;

// Offline play once installed. Skipped in dev; a host without sw.js simply rejects the registration.
if (import.meta.env.PROD && "serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => void navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
