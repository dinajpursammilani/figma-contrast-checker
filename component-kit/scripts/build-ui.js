const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "src", "ui.html");
const distDir = path.join(__dirname, "..", "dist");
const dest = path.join(distDir, "ui.html");

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("ui.html copied to dist/");
