const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const changelogPath = path.join(rootDir, "CHANGELOG.md");

function runLernaChangelog(args) {
  const cliPath = require.resolve("lerna-changelog/bin/cli");
  return execFileSync(process.execPath, [cliPath, ...args], {
    cwd: rootDir,
    env: process.env,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  }).trim();
}

function getNextVersion() {
  const lernaConfig = require(path.join(rootDir, "lerna.json"));
  return lernaConfig.version;
}

function getLastTag() {
  try {
    return execFileSync("git", ["describe", "--abbrev=0", "--tags"], {
      cwd: rootDir,
      env: process.env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function getFirstCommit() {
  return execFileSync("git", ["rev-list", "--max-parents=0", "HEAD"], {
    cwd: rootDir,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })
    .trim()
    .split("\n")[0];
}

function prependChangelog(content) {
  const existing = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, "utf8").trim()
    : "";

  const sections = [content.trim()];
  if (existing) {
    sections.push(existing);
  }

  fs.writeFileSync(changelogPath, `${sections.join("\n\n\n")}\n`, "utf8");
}

function stageChangelog() {
  const result = spawnSync("git", ["add", "--", changelogPath], {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error("git add CHANGELOG.md 失败");
  }
}

function main() {
  const cliArgs = process.argv.slice(2);

  if (cliArgs.includes("--help") || cliArgs.includes("-h")) {
    runLernaChangelog(cliArgs);
    return;
  }

  const args =
    cliArgs.length > 0
      ? cliArgs
      : getLastTag()
        ? ["--next-version", getNextVersion()]
        : ["--from", getFirstCommit(), "--next-version", getNextVersion()];
  const output = runLernaChangelog(args);

  if (!output) {
    return;
  }

  prependChangelog(output);
  stageChangelog();
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
