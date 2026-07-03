// Build the game and publish dist/ to the gh-pages branch, without ever touching
// the main working tree's checked-out branch (it may have uncommitted work in
// progress). Publishing happens entirely inside a scratch `git worktree`.
//
// GitHub Pages (see .github/workflows/pages.yml) checks out gh-pages and uploads
// its full contents as the Pages artifact on every push to master. So "deploying"
// is really two things: (1) get a fresh dist/ build committed+pushed to gh-pages,
// and (2) push master so the workflow fires. This script handles (1); pushing
// master is left to the normal `git push` you'd do anyway (see final summary).
//
// Usage:
//   node tools/deploy-pages.mjs            # build, publish, push gh-pages
//   node tools/deploy-pages.mjs --dry-run  # do everything except the final push
//
// Requirements: Node >= 18, zero extra dependencies (node:child_process, node:fs, node:os only).

import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  rmSync,
  cpSync,
  readdirSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');
const REPO_ROOT = process.cwd();
const DIST_DIR = join(REPO_ROOT, 'dist');
const BRANCH = 'gh-pages';
const REMOTE = 'origin';

function log(step, msg) {
  console.log(`[deploy-pages] ${step ? `[${step}] ` : ''}${msg}`);
}

function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: opts.quiet ? ['ignore', 'pipe', 'pipe'] : undefined,
    ...opts,
  });
}

function gitIn(cwd, args, opts = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: opts.quiet ? ['ignore', 'pipe', 'pipe'] : undefined,
    ...opts,
  });
}

function step1_build() {
  log('1/4', 'Running npm run build (tsc --noEmit && vite build)...');
  try {
    execFileSync('npm', ['run', 'build'], { cwd: REPO_ROOT, stdio: 'inherit', shell: true });
  } catch (err) {
    log('1/4', 'Build FAILED. Aborting deploy — nothing was touched.');
    throw err;
  }
  if (!existsSync(DIST_DIR)) {
    throw new Error(`Build reported success but ${DIST_DIR} does not exist.`);
  }
  log('1/4', 'Build succeeded: dist/ is fresh.');
}

function step2_ensureLocalGhPages() {
  log('2/4', `Fetching ${REMOTE}/${BRANCH}...`);
  git(['fetch', REMOTE, BRANCH], { quiet: true });

  // Create/reset a local gh-pages ref to match origin/gh-pages, WITHOUT checking
  // it out anywhere in the main working tree. `git branch -f` just moves/creates
  // the ref; it does not touch HEAD or the working directory.
  git(['branch', '-f', BRANCH, `${REMOTE}/${BRANCH}`]);
  log('2/4', `Local '${BRANCH}' ref set to ${REMOTE}/${BRANCH} (main working tree untouched).`);
}

function step3_publish() {
  const worktreeDir = mkdtempSync(join(tmpdir(), 'counter-attack-gh-pages-'));
  log('3/4', `Created scratch worktree at "${worktreeDir}".`);
  try {
    git(['worktree', 'add', worktreeDir, BRANCH]);

    // Wipe every tracked+untracked entry in the worktree except .git, then copy
    // the fresh dist/ output in. Using fs.rmSync/cpSync (not rm/cp) for Windows safety.
    const entries = readdirSync(worktreeDir);
    for (const entry of entries) {
      if (entry === '.git') continue;
      rmSync(join(worktreeDir, entry), { recursive: true, force: true });
    }
    cpSync(DIST_DIR, worktreeDir, { recursive: true });

    // Preserve the .nojekyll marker that already lives on gh-pages today (it's
    // an empty file GitHub Pages uses to skip Jekyll processing of the `assets/`
    // dir). Vite's build doesn't emit it, so (re)create it if it isn't already
    // present after the copy — harmless if the Pages uploader doesn't need it.
    const nojekyllPath = join(worktreeDir, '.nojekyll');
    if (!existsSync(nojekyllPath)) {
      writeFileSync(nojekyllPath, '');
      log('3/4', 'Wrote .nojekyll (preserving existing gh-pages convention).');
    }

    log('3/4', `Copied dist/ contents into worktree root: ${readdirSync(worktreeDir).filter((e) => e !== '.git').join(', ')}`);

    gitIn(worktreeDir, ['add', '-A']);

    // Detect whether there's anything to commit.
    let hasChanges = true;
    try {
      gitIn(worktreeDir, ['diff', '--cached', '--quiet']);
      hasChanges = false;
    } catch {
      hasChanges = true; // non-zero exit = there are staged changes
    }

    if (!hasChanges) {
      log('3/4', 'No changes vs. current gh-pages content — nothing to commit or push.');
      return { pushed: false, sha: gitIn(worktreeDir, ['rev-parse', 'HEAD']).trim() };
    }

    const masterSha = git(['rev-parse', '--short', 'HEAD']).trim();
    const dateStr = new Date().toISOString().slice(0, 10);
    const commitMsg = `deploy: ${masterSha} ${dateStr}`;
    gitIn(worktreeDir, ['commit', '-m', commitMsg]);
    const newSha = gitIn(worktreeDir, ['rev-parse', 'HEAD']).trim();
    log('3/4', `Committed to ${BRANCH}: ${commitMsg} (${newSha.slice(0, 7)})`);

    if (DRY_RUN) {
      log('3/4', `[dry-run] Would push ${BRANCH} -> ${REMOTE}/${BRANCH} (commit ${newSha.slice(0, 7)}). Skipping push.`);
      return { pushed: false, dryRun: true, sha: newSha };
    }

    log('4/4', `Pushing ${BRANCH} to ${REMOTE}...`);
    gitIn(worktreeDir, ['push', REMOTE, `${BRANCH}:${BRANCH}`]);
    log('4/4', 'Push complete.');
    return { pushed: true, sha: newSha };
  } finally {
    log('cleanup', `Removing scratch worktree "${worktreeDir}"...`);
    try {
      git(['worktree', 'remove', '--force', worktreeDir]);
    } catch (err) {
      // Worktree metadata can get out of sync (e.g. dir already gone); fall back
      // to a raw filesystem removal plus a prune so `git worktree list` stays clean.
      log('cleanup', `git worktree remove failed (${err.message.split('\n')[0]}); removing directory directly.`);
      rmSync(worktreeDir, { recursive: true, force: true });
      try {
        git(['worktree', 'prune']);
      } catch {
        /* best effort */
      }
    }
  }
}

async function main() {
  console.log('=== Counter Attack! — GitHub Pages deploy ===');
  if (DRY_RUN) log(null, '--dry-run: build + commit will run, but nothing will be pushed.');

  step1_build();
  step2_ensureLocalGhPages();
  const result = step3_publish();

  console.log('\n=== Summary ===');
  if (result.pushed) {
    console.log(`Pushed commit ${result.sha.slice(0, 7)} to ${REMOTE}/${BRANCH}.`);
    console.log('Live site: https://concretejungler.github.io/counter-attack-game/');
    console.log('');
    console.log(".github/workflows/pages.yml only triggers on a push to 'master' (or manual");
    console.log('dispatch) — pushing gh-pages alone does NOT redeploy Pages. If you have local');
    console.log('commits on master, push those too to actually update the live site:');
    console.log('  git push origin master');
  } else if (result.dryRun) {
    console.log(`[dry-run] Would have pushed commit ${result.sha.slice(0, 7)} to ${REMOTE}/${BRANCH}.`);
    console.log('Re-run without --dry-run to actually push.');
  } else {
    console.log(`No new commit — ${BRANCH} already matches the fresh dist/ build (HEAD ${result.sha.slice(0, 7)}).`);
    console.log("Remember to push 'master' separately to trigger the Pages workflow if you have local commits.");
  }
}

main().catch((err) => {
  console.error('\n[deploy-pages] FAILED:', err.message);
  process.exitCode = 1;
});
