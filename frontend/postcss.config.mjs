import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

let projectDir = path.dirname(fileURLToPath(import.meta.url));
// If Next.js evaluated from inside .next, step up to the frontend directory
if (projectDir.endsWith(".next")) {
  projectDir = path.dirname(projectDir);
}
// Double check: if node_modules does not exist here, look for frontend root
if (!fs.existsSync(path.join(projectDir, "node_modules", "tailwindcss"))) {
  projectDir = path.resolve(process.cwd());
  if (projectDir.endsWith(".next")) {
    projectDir = path.dirname(projectDir);
  }
}

const nodeModules = path.join(projectDir, "node_modules");
const tailwindCssEntry = path.join(nodeModules, "tailwindcss", "index.css");

// Ensure NODE_PATH contains frontend/node_modules
if (!process.env.NODE_PATH || !process.env.NODE_PATH.includes(nodeModules)) {
  process.env.NODE_PATH = process.env.NODE_PATH
    ? `${nodeModules};${process.env.NODE_PATH}`
    : nodeModules;
}

// Intercept Tailwind v4 resolver so @import "tailwindcss" always finds index.css
globalThis.__tw_resolve = (id, base) => {
  if (id === "tailwindcss") {
    return tailwindCssEntry;
  }
  if (id.startsWith("tailwindcss/")) {
    return path.join(nodeModules, id);
  }
};

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: projectDir,
    },
  },
};

export default config;
