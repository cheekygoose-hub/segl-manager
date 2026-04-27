// Netlify build script — injects SEGL_APP_PASSWORD into the HTML
const fs   = require("fs");
const path = require("path");

const password = process.env.SEGL_APP_PASSWORD || "";
if (!password) {
  console.error("ERROR: SEGL_APP_PASSWORD environment variable is not set.");
  process.exit(1);
}

const template = fs.readFileSync("index.html.template", "utf8");
const output   = template.replace("%%APP_PASSWORD%%", password.replace(/"/g, '\\"'));

fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync(path.join("dist", "index.html"), output);
console.log("Build complete. Password injected into dist/index.html");
