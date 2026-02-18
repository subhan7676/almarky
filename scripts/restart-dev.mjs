import fs from "node:fs";
import path from "node:path";
import { execSync, spawn } from "node:child_process";

const port = Number(process.env.PORT || 3000);
const rootDir = process.cwd();
const logPath = path.join(rootDir, "devserver.log");
let activeLogPath = logPath;

function getListeningPidsOnWindows(targetPort) {
  const output = execSync("netstat -ano -p tcp", {
    cwd: rootDir,
    encoding: "utf8",
  });

  const lines = output.split(/\r?\n/);
  const pids = new Set();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("TCP")) continue;
    if (!trimmed.includes(`:${targetPort}`)) continue;
    if (!trimmed.includes("LISTENING")) continue;
    const columns = trimmed.split(/\s+/);
    const pid = columns[columns.length - 1];
    if (pid && /^\d+$/.test(pid)) pids.add(pid);
  }

  return Array.from(pids);
}

function killPortListeners(targetPort) {
  if (process.platform !== "win32") return;
  const pids = getListeningPidsOnWindows(targetPort);
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, {
        cwd: rootDir,
        stdio: "ignore",
      });
    } catch {
      // Ignore race conditions when process exits itself.
    }
  }
}

function startDevServer() {
  let outFd = 0;
  activeLogPath = logPath;
  try {
    outFd = fs.openSync(logPath, "a");
  } catch {
    // Some Windows setups lock the log file (no delete-sharing). Fall back to a new file.
    activeLogPath = path.join(rootDir, `devserver-${Date.now()}.log`);
    outFd = fs.openSync(activeLogPath, "a");
  }

  const startCommand = process.platform === "win32"
    ? `node_modules\\.bin\\next dev --webpack -p ${port}`
    : `./node_modules/.bin/next dev --webpack -p ${port}`;

  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/c", startCommand], {
          cwd: rootDir,
          detached: true,
          stdio: ["ignore", outFd, outFd],
        })
      : spawn("sh", ["-lc", startCommand], {
          cwd: rootDir,
          detached: true,
          stdio: ["ignore", outFd, outFd],
        });

  child.unref();
  try {
    fs.closeSync(outFd);
  } catch {}
  return child.pid ?? 0;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForServer(targetPort, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  const url = `http://127.0.0.1:${targetPort}`;
  while (Date.now() < deadline) {
    try {
      const response = await fetchWithTimeout(url, 3500);
      if (response.ok || response.status >= 300 || response.status === 404) {
        return true;
      }
    } catch {
      // Keep polling until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function readLogTail(maxLines = 40) {
  if (!fs.existsSync(activeLogPath)) return "";
  const lines = fs.readFileSync(activeLogPath, "utf8").split(/\r?\n/);
  return lines.slice(-maxLines).join("\n").trim();
}

async function main() {
  killPortListeners(port);
  const lockPath = path.join(rootDir, ".next", "dev", "lock");
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
  }
  const pid = startDevServer();
  const ready = await waitForServer(port);

  if (!ready) {
    console.error(`Dev server failed to start on http://localhost:${port}`);
    const tail = readLogTail();
    if (tail) {
      console.error("--- devserver.log (tail) ---");
      console.error(tail);
    }
    process.exit(1);
  }

  console.log(`Dev server running on http://localhost:${port}`);
  console.log(`Process PID: ${pid}`);
  console.log(`Log file: ${activeLogPath}`);
}

main().catch((error) => {
  console.error("Failed to restart dev server:", error);
  process.exit(1);
});
