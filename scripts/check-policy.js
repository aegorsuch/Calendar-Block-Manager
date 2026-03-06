#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function fail(message) {
  console.error(`[check:policy] ${message}`);
  process.exitCode = 1;
}

function readText(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireSection(content, marker, filePath) {
  if (!content.includes(marker)) {
    fail(`Missing section '${marker}' in ${filePath}`);
  }
}

function requireScript(pkg, name) {
  if (!pkg.scripts || !pkg.scripts[name]) {
    fail(`Missing npm script '${name}' in package.json`);
  }
}

const readme = readText("README.md");
const contributing = readText("CONTRIBUTING.md");
const workflow = readText(path.join(".github", "workflows", "ci.yml"));
const prePush = readText(path.join(".githooks", "pre-push"));
const packageJsonText = readText("package.json");

let pkg;
try {
  pkg = JSON.parse(packageJsonText);
} catch (error) {
  fail(`Invalid package.json JSON: ${error.message}`);
  pkg = {};
}

requireSection(readme, "## 🤖 Automation", "README.md");
requireSection(readme, "## ✅ Stable Daily Ops (5 Lines)", "README.md");
requireSection(readme, "## 📄 Rollback", "README.md");
requireSection(contributing, "## Rollback Playbook", "CONTRIBUTING.md");

requireScript(pkg, "test");
requireScript(pkg, "check:policy");
requireScript(pkg, "check:full");
requireScript(pkg, "deploy:all");
requireScript(pkg, "gas:push");
requireScript(pkg, "setup:hooks");

if (!workflow.includes("policy-checks")) {
  fail("CI workflow must include a 'policy-checks' job.");
}
if (!workflow.includes("unit-tests")) {
  fail("CI workflow must include a 'unit-tests' job.");
}
if (!workflow.includes("pull_request")) {
  fail("CI workflow must run on pull requests.");
}
if (!prePush.includes("npm run check:full")) {
  fail("pre-push hook must run 'npm run check:full'.");
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("[check:policy] Policy checks passed.");
