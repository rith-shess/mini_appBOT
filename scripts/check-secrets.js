#!/usr/bin/env node

/**
 * Secret Scanner Script: npm run check:secrets
 * Fails if any Telegram bot token pattern [0-9]{8,10}:[A-Za-z0-9_-]{35} is matched
 * in any project file outside node_modules, .git, and scratch directories.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const TOKEN_REGEX = /[0-9]{8,10}:[A-Za-z0-9_-]{35}/g;

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist-ssr',
  'scratch',
  '.vscode',
  '.idea',
]);

const IGNORE_FILES = new Set([
  'package-lock.json',
]);

let leaksFound = 0;
const leakedFiles = [];

function scanDirectory(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      if (IGNORE_FILES.has(entry.name)) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(TOKEN_REGEX);
        if (matches && matches.length > 0) {
          leaksFound += matches.length;
          leakedFiles.push({ file: relPath, count: matches.length });
        }
      } catch (err) {
        // Skip unreadable files (e.g. binary images)
      }
    }
  }
}

console.log('🔍 Scanning repository for hardcoded Telegram bot tokens...');
scanDirectory(ROOT_DIR);

if (leaksFound > 0) {
  console.error('\n❌ SECURITY ALERT: Potential bot token secrets detected in the codebase:');
  for (const item of leakedFiles) {
    console.error(`  - ${item.file} (${item.count} match${item.count > 1 ? 'es' : ''})`);
  }
  console.error('\nPlease remove all token values. Bot tokens must exist ONLY in server-side environment variables.');
  process.exit(1);
} else {
  console.log('✅ PASS: Zero secrets found! No Telegram bot token pattern matched anywhere in the repository.');
  process.exit(0);
}
