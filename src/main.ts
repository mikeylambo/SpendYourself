import { App } from "./ui/app.ts";

const app = new App(document.getElementById("app")!);
void app.boot();
if (new URLSearchParams(location.search).get("dev") === "1") (window as unknown as { app: App }).app = app;
