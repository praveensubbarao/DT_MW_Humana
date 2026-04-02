#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getStagedSpecFiles() {
  const diff = execSync('git diff --cached --name-only --diff-filter=ACM', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();

  if (!diff) return [];
  return diff
    .split('\n')
    .map((file) => file.trim())
    .filter((file) => file.endsWith('.spec.ts'));
}

function hasCommentBeforeTest(lines, testIndex) {
  for (let i = testIndex - 1; i >= 0; i -= 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('//')) return true;
    if (trimmed.endsWith('*/')) return true;
    if (trimmed.startsWith('/*')) return true;
    if (trimmed.startsWith('*')) return true;
    return false;
  }
  return false;
}

function validateFile(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const fileContent = fs.readFileSync(absolutePath, 'utf8');
  const lines = fileContent.split(/\r?\n/);
  const testPattern = /^\s*test(?:\.(only|skip|fixme|slow))?\s*\(/;
  const errors = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (testPattern.test(lines[i])) {
      if (!hasCommentBeforeTest(lines, i)) {
        errors.push(`Missing comment with test steps before 'test(...)' at ${filePath}:${i + 1}`);
      }
    }
  }

  return errors;
}

function main() {
  const specFiles = getStagedSpecFiles();
  if (specFiles.length === 0) {
    process.exit(0);
  }

  let allErrors = [];

  for (const file of specFiles) {
    if (!fs.existsSync(file)) continue;
    allErrors = allErrors.concat(validateFile(file));
  }

  if (allErrors.length > 0) {
    console.error('\n🛑 Spec comment validation failed');
    console.error('Each staged .spec.ts file must include a comment before every test block with the intended test steps.');
    console.error('\nDetails:');
    for (const error of allErrors) {
      console.error(`- ${error}`);
    }
    console.error('\nPlease add comments above the failing tests and stage the file again.');
    process.exit(1);
  }

  console.log('✅ Spec comment validation passed.');
  process.exit(0);
}

main();
