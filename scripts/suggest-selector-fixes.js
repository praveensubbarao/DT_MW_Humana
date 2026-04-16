#!/usr/bin/env node
/**
 * suggest-selector-fixes.js
 *
 * Reads self-heal-report/heal-log.json produced during a Playwright run and
 * scans the actions source files to find every selfHeal() call whose primary
 * selector was overridden. For each one it prints a targeted code patch so
 * the developer can update the primary selector and prevent future heals.
 *
 * Usage:
 *   yarn heal:suggest              — print suggestions to terminal
 *   yarn heal:suggest --apply      — write the patches directly to source files
 *   yarn heal:suggest --json       — output suggestions as JSON (CI-friendly)
 *
 * The log is cleared at the start of each `yarn test` run by selfHealReporter.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const HEAL_LOG   = path.resolve(process.cwd(), 'self-heal-report', 'heal-log.json');
const ACTIONS_DIR = path.resolve(process.cwd(), 'src', 'actions');
const APPLY_MODE = process.argv.includes('--apply');
const JSON_MODE  = process.argv.includes('--json');

// ─── Load heal log ────────────────────────────────────────────────────────────

if (!fs.existsSync(HEAL_LOG)) {
  console.log('\n⚠️   No heal log found at:');
  console.log('    ' + HEAL_LOG);
  console.log('\nThis means the test suite has not been run yet with the self-heal reporter active.');
  console.log('Steps to generate the log:');
  console.log('  1. Ensure OLLAMA_BASE_URL and OLLAMA_API_KEY are set in your .env');
  console.log('  2. Run: yarn test');
  console.log('  3. Then run: yarn heal:suggest\n');
  process.exit(0);
}

let entries;
try {
  entries = JSON.parse(fs.readFileSync(HEAL_LOG, 'utf-8'));
} catch {
  console.log('\n⚠️   Heal log exists but could not be parsed:', HEAL_LOG);
  console.log('    Try deleting it and running yarn test again.\n');
  process.exit(1);
}

if (entries.length === 0) {
  console.log('\n✅  No healing was needed last run — all primary selectors resolved.');
  console.log('    The log resets each time yarn test runs.\n');
  process.exit(0);
}

// ─── Find all .ts files under src/actions ────────────────────────────────────

function walkTs(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkTs(full));
    else if (entry.name.endsWith('.ts')) results.push(full);
  }
  return results;
}

const actionFiles = walkTs(ACTIONS_DIR);

// ─── For each heal entry, search action files for matching selfHeal() call ───

/**
 * Finds the selfHeal() call block whose description matches the heal entry.
 * Returns { file, lineNumber, primaryLine, primaryContent } or null.
 */
function findSelfHealCall(description) {
  for (const file of actionFiles) {
    const lines = fs.readFileSync(file, 'utf-8').split('\n');

    for (let i = 0; i < lines.length; i++) {
      // Look for a selfHeal( call that contains the description on a nearby line
      if (!lines[i].includes('selfHeal(')) continue;

      // Scan ahead up to 10 lines for the description string
      const block = lines.slice(i, i + 10).join('\n');
      if (!block.includes(description)) continue;

      // Now find the `primary:` line within this block
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('primary:') && lines[j].includes('=>')) {
          return {
            file,
            relFile:        path.relative(process.cwd(), file),
            selfHealLine:   i + 1,        // 1-based
            primaryLine:    j + 1,        // 1-based
            primaryContent: lines[j],
            lineIndex:      j,            // 0-based for splice
          };
        }
      }
    }
  }
  return null;
}

// ─── Build suggestions ────────────────────────────────────────────────────────

const suggestions = [];

for (const entry of entries) {
  const match = findSelfHealCall(entry.description);

  if (!match) {
    suggestions.push({
      found:       false,
      description: entry.description,
      healedSelector: entry.healedSelector,
      confidence:  entry.confidence,
      reasoning:   entry.reasoning,
      testTitle:   entry.testTitle,
    });
    continue;
  }

  // Build the replacement primary line — preserve indentation
  const indent        = match.primaryContent.match(/^(\s*)/)[1];
  const newPrimaryLine = `${indent}primary: p => p.locator('${entry.healedSelector}').first(),`;

  suggestions.push({
    found:          true,
    description:    entry.description,
    healedSelector: entry.healedSelector,
    confidence:     entry.confidence,
    reasoning:      entry.reasoning,
    testTitle:      entry.testTitle,
    file:           match.file,
    relFile:        match.relFile,
    selfHealLine:   match.selfHealLine,
    primaryLine:    match.primaryLine,
    oldPrimaryLine: match.primaryContent,
    newPrimaryLine,
    lineIndex:      match.lineIndex,
  });
}

// ─── Output ───────────────────────────────────────────────────────────────────

if (JSON_MODE) {
  console.log(JSON.stringify(suggestions, null, 2));
  process.exit(0);
}

const SEP = '─'.repeat(72);

console.log('\n' + SEP);
console.log(`  SELF-HEAL SELECTOR FIX SUGGESTIONS  (${suggestions.length} item${suggestions.length === 1 ? '' : 's'})`);
console.log(SEP + '\n');

let patchCount = 0;

for (const s of suggestions) {
  console.log(`  Description : ${s.description}`);
  console.log(`  Test        : ${s.testTitle}`);
  console.log(`  Healed to   : ${s.healedSelector}  [${s.confidence}]`);
  console.log(`  Reason      : ${s.reasoning}`);

  if (!s.found) {
    console.log(`  Source      : ⚠️  Could not locate matching selfHeal() call in src/actions/`);
    console.log(`                    Update the primary selector manually.\n`);
    continue;
  }

  console.log(`  Source      : ${s.relFile}:${s.primaryLine}`);
  console.log(`\n  Before:`);
  console.log(`    ${s.oldPrimaryLine.trim()}`);
  console.log(`\n  After:`);
  console.log(`    ${s.newPrimaryLine.trim()}`);

  if (APPLY_MODE) {
    const lines = fs.readFileSync(s.file, 'utf-8').split('\n');
    lines[s.lineIndex] = s.newPrimaryLine;
    fs.writeFileSync(s.file, lines.join('\n'));
    console.log(`\n  ✅  Patch applied to ${s.relFile}`);
    patchCount++;
  } else {
    console.log(`\n  ➜  To apply: yarn heal:suggest --apply`);
  }

  console.log('\n' + SEP + '\n');
}

if (APPLY_MODE && patchCount > 0) {
  console.log(`\n✅  ${patchCount} file(s) patched. Review the changes with: git diff src/actions/`);
  console.log('   Commit when satisfied — the healed selectors are now the primary selectors.\n');
}

if (!APPLY_MODE && suggestions.some(s => s.found)) {
  console.log('  Tip: run with --apply to write all patches automatically.\n');
}
