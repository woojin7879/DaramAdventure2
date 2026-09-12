import { mkdir, cp, copyFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await Promise.all([
  cp("src", "dist/src", { recursive: true }),
  cp("public", "dist", { recursive: true }),
  copyFile("index.html", "dist/index.html"),
  copyFile("lab.html", "dist/lab.html"),
  copyFile("boss.html", "dist/boss.html"),
  copyFile("admin.html", "dist/admin.html"),
]);
console.log("Built Daram Survivors → dist");
