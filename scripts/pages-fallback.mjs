import { access, copyFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const pub = resolve(import.meta.dirname, "../.output/public");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const names = ["index.html", "pages.html", "_shell.html", "404.html"];
let src = null;
for (const name of names) {
  const path = resolve(pub, name);
  if (await exists(path)) {
    src = path;
    break;
  }
}

if (!src) {
  const listing = await readdir(pub).catch(() => []);
  console.error("pages-fallback: no HTML shell in", pub, listing.slice(0, 40));
  process.exit(1);
}

await copyFile(src, resolve(pub, "index.html"));
await copyFile(src, resolve(pub, "404.html"));
await writeFile(resolve(pub, ".nojekyll"), "");
console.log(`pages-fallback: index.html + 404.html + .nojekyll from ${src}`);
