/*
 * Starts the live site: the Express server (public, on PORT) and the
 * Next.js store (private, on NEXT_PORT). Express answers /api and /admin
 * and passes all store pages to Next.js. If one of them stops, both stop,
 * so the hosting service restarts the whole site.
 *
 *   npm run build   (once, after every update)
 *   npm start
 */
const { spawn } = require("child_process");
const path = require("path");

const PORT = process.env.PORT || "5000";
const NEXT_PORT = process.env.NEXT_PORT || "3001";
const isWindows = process.platform === "win32";

function run(name, command, args, cwd, extraEnv) {
  const child = spawn(command, args, {
    cwd: path.join(__dirname, cwd),
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    shell: isWindows, // npm/npx are .cmd files on Windows
  });
  child.on("exit", (code) => {
    console.error(`${name} stopped (code ${code}). Stopping the site.`);
    shutdown(code || 1);
  });
  return child;
}

const children = [
  run("Store (Next.js)", "npx", ["next", "start", "-p", NEXT_PORT, "-H", "127.0.0.1"], "client", {
    API_URL: `http://127.0.0.1:${PORT}`,
    PORT: NEXT_PORT,
  }),
  run("API (Express)", "node", ["index.js"], "server", {
    PORT,
    NEXT_URL: `http://127.0.0.1:${NEXT_PORT}`,
  }),
];

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
