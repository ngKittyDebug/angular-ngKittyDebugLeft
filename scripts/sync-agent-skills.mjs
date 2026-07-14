// Mirror every lockfile-managed skill from .agents/skills/ into .claude/skills/ as a REAL directory.
//
// The `skills` CLI symlinks .claude/skills/<name> -> ../../.agents/skills/<name>. Git for Windows
// probes NTFS and sets core.symlinks=false, so a symlink is checked out as a plain text file holding
// the target path — Claude Code then sees a file where it expects a skill folder and loads nothing.
// Copies cost some duplication but work on every platform with no per-developer setup.
//
// Only lockfile-managed skills are touched; hand-authored ones (pr-review, codebase-audit, _shared)
// are left alone. Run after `skills update -p` — `pnpm skills:update` chains both.

import { cpSync, existsSync, lstatSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const agentsDirectory = join(repoRoot, '.agents', 'skills');
const claudeDirectory = join(repoRoot, '.claude', 'skills');

const lock = JSON.parse(readFileSync(join(repoRoot, 'skills-lock.json'), 'utf8'));
const names = Object.keys(lock.skills ?? {}).sort();

if (names.length === 0) {
  console.error('skills-lock.json lists no skills — nothing to sync.');
  process.exit(1);
}

let copied = 0;
const missing = [];

for (const name of names) {
  const source = join(agentsDirectory, name);

  if (!existsSync(source)) {
    missing.push(name);
    continue;
  }

  const destination = join(claudeDirectory, name);

  // lstat, not exists: a symlink left by the CLI must be removed, not followed.
  if (lstatSync(destination, { throwIfNoEntry: false })) {
    rmSync(destination, { force: true, recursive: true });
  }

  cpSync(source, destination, { dereference: true, recursive: true });
  copied += 1;
}

console.log(`Synced ${copied}/${names.length} skills into .claude/skills/ as real directories.`);

if (missing.length > 0) {
  console.error(`Missing from .agents/skills/: ${missing.join(', ')}`);
  console.error('Run `npx skills update -p` (or `experimental_install`) first.');
  process.exit(1);
}
