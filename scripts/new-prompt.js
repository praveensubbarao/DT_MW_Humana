#!/usr/bin/env node
// Usage: node scripts/new-prompt.js --name "gen-page-object" --category "scaffolding"

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const name = get('--name');
const category = get('--category') || 'other';

if (!name) {
  console.error('Error: --name is required');
  console.error('Usage: node scripts/new-prompt.js --name "my-prompt" --category "scaffolding"');
  process.exit(1);
}

const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const today = new Date().toISOString().split('T')[0];
const promptsDir = path.join(__dirname, '..', '.claude', 'prompts');
const outPath = path.join(promptsDir, `${slug}.md`);

if (fs.existsSync(outPath)) {
  console.error(`Error: ${outPath} already exists`);
  process.exit(1);
}

const template = fs.readFileSync(path.join(promptsDir, '_template.md'), 'utf8');
const filled = template
  .replace('<short human-readable name>', name)
  .replace('<scaffolding | assertions | mocking | debugging | refactor | other>', category)
  .replace('<YYYY-MM-DD>', today);

fs.writeFileSync(outPath, filled);
console.log(`Created: .claude/prompts/${slug}.md`);
console.log(`Next: fill in the prompt, then add a row to .claude/prompts/index.md`);
