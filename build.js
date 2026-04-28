const fs   = require("fs");
const path = require("path");

const password = process.env.SEGL_APP_PASSWORD || "";
if (!password) { console.error("ERROR: SEGL_APP_PASSWORD not set"); process.exit(1); }

// Install babel if needed
const { execSync } = require("child_process");
try {
  require("@babel/core");
} catch(e) {
  console.log("Installing @babel/core...");
  execSync("npm install @babel/core @babel/preset-react @babel/preset-env", { stdio: "inherit" });
}

const babel = require("@babel/core");

const jsxSrc = fs.readFileSync("app.jsx", "utf8");

console.log("Compiling JSX...");
const result = babel.transform(jsxSrc, {
  presets: [
    ["@babel/preset-react", { runtime: "classic" }],
    ["@babel/preset-env", { targets: "defaults", modules: false }],
  ],
  sourceType: "script",
});

const compiledJs = result.code
  .replace(/^"use strict";/, "")
  .trim();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <title>SEGL Golf League 2026</title>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="theme-color" content="#09090b"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #09090b; color: white; -webkit-tap-highlight-color: transparent; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: #18181b; }
    ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }
    input, button, select, textarea { font-family: inherit; }
  </style>
</head>
<body>
<div id="root"></div>
<script>window.__APP_PASSWORD__ = ${JSON.stringify(password)};</script>
<script>
${compiledJs}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
</script>
</body>
</html>`;

fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync(path.join("dist", "index.html"), html);
console.log("Build complete. Output: dist/index.html (" + Math.round(html.length/1024) + "KB)");
