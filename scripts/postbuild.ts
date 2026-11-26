/**
 * GitHub Pages の SPA フォールバック用に index.html を 404.html として複製する。
 * 直接 /quiz/L1 などを開いた場合も 404.html がアプリを起動する。
 */
import { copyFile } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve(import.meta.dir, "..", "dist");

await copyFile(path.join(dist, "index.html"), path.join(dist, "404.html"));
console.log("dist/404.html を作成しました");
