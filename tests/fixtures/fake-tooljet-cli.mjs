// Stands in for the ToolJet CLI in the Code mode tool tests: answers from FAKE_CLI_REPLIES (JSON: "<command>" →
// { code, output }) and appends each call to FAKE_CLI_LOG.
import { appendFileSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const command = args.filter((a) => !a.startsWith('-')).slice(0, 2).join(' ');
appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify({ args, cwd: process.cwd() }) + '\n');
const replies = JSON.parse(process.env.FAKE_CLI_REPLIES || '{}');
const reply = replies[command] ?? { code: 0, output: '' };
if (command === 'app install' && reply.code === 0) writeFileSync(join(process.cwd(), 'frontend', 'package-lock.json'), '{"installed":true}\n');
// FAKE_INSTALL_LINK (JSON { name, target }): the install links frontend/node_modules/<name> to target, as npm does for file:.
if (command === 'app install' && process.env.FAKE_INSTALL_LINK) {
  const { name, target } = JSON.parse(process.env.FAKE_INSTALL_LINK);
  mkdirSync(join(process.cwd(), 'frontend', 'node_modules'), { recursive: true });
  symlinkSync(target, join(process.cwd(), 'frontend', 'node_modules', name));
}
process.stdout.write(typeof reply.output === 'string' ? reply.output : JSON.stringify(reply.output));
process.exit(reply.code);
