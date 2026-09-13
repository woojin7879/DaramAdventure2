import { GAME_VERSION, patchNotesMarkdown } from "../src/release-notes.js";
import { mkdir, cp, copyFile, readFile, writeFile } from "node:fs/promises";
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
if (pkg.version !== GAME_VERSION || lock.version !== GAME_VERSION || lock.packages[''].version !== GAME_VERSION)
  throw new Error('Game, package and lockfile versions must match before release.');
await mkdir("dist", { recursive: true });
await Promise.all([
  cp("src", "dist/src", { recursive: true }),
  cp("public", "dist", { recursive: true }),
  copyFile("index.html", "dist/index.html"),
  copyFile("lab.html", "dist/lab.html"),
  copyFile("boss.html", "dist/boss.html"),
  copyFile("admin.html", "dist/admin.html"),
  writeFile("dist/CHANGELOG.md", patchNotesMarkdown()),
]);
console.log("Built Daram Survivors → dist");
