#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

function run(command, args, options = {}) {
  const display = `${command} ${args.join(" ")}`.trim();
  console.log(`[deploy:all] $ ${display}`);

  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    ...options
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${display}`);
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: true
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    throw new Error(stderr || `Command failed: ${command} ${args.join(" ")}`);
  }

  return (result.stdout || "").trim();
}

function assertGitRepo() {
  const inside = capture("git", ["rev-parse", "--is-inside-work-tree"]);
  if (inside !== "true") {
    throw new Error("Current directory is not a git repository.");
  }
}

function assertMainBranch() {
  const branch = capture("git", ["branch", "--show-current"]);
  if (branch !== "main") {
    throw new Error(`Refusing deploy from branch '${branch}'. Switch to 'main'.`);
  }
}

function assertCleanTree() {
  const status = capture("git", ["status", "--porcelain"]);
  if (status) {
    throw new Error("Working tree is not clean. Commit or stash changes before deploy.");
  }
}

function assertClaspReady() {
  run("clasp", ["--version"]);
  run("clasp", ["show-authorized-user"]);
}

function main() {
  try {
    assertGitRepo();
    assertMainBranch();
    assertCleanTree();

    assertClaspReady();
    run("npm", ["run", "check:full"]);
    run("npm", ["run", "gas:push"]);
    run("git", ["push"]);

    console.log("[deploy:all] Deployment completed successfully.");
  } catch (error) {
    console.error(`[deploy:all] ${error.message}`);
    process.exit(1);
  }
}

main();
