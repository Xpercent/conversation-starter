/**
 * The shipped topic bank, read straight off disk.
 *
 * src/data/topics.ts builds the same bank with `import.meta.glob`, which only
 * exists once the bundler has resolved it — so the node scripts, which run as
 * plain node, follow the manifest with fs instead. Both read the same
 * topics.json, so a bank that drifts between the two shows up as a failing
 * check rather than a silent difference.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Category } from '../src/data/topics.ts';

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data');
const topicsDir = resolve(dataDir, 'topics');

/** The manifest: which topic files make up the bank, in interface order. */
export const listedTopicFiles = (): string[] =>
  JSON.parse(readFileSync(resolve(dataDir, 'topics.json'), 'utf8')).files as string[];

export const topicFilesOnDisk = (): string[] =>
  readdirSync(topicsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

/** Parses a listed file; throws if the manifest names something that isn't there. */
export const readTopicFile = (file: string): Category =>
  JSON.parse(readFileSync(resolve(topicsDir, file), 'utf8')) as Category;

export const loadShippedBank = (): Category[] => listedTopicFiles().map(readTopicFile);
