import { promises as fs } from "node:fs";
import path from "node:path";

import type { CricketStore } from "@/types/scorer";

const STORE_PATH = path.join(process.cwd(), "data", "cricket-store.json");

const EMPTY_STORE: CricketStore = {
  teams: [],
  matches: [],
};

async function ensureStoreFile(): Promise<void> {
  const storeDirectory = path.dirname(STORE_PATH);
  await fs.mkdir(storeDirectory, { recursive: true });

  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf-8");
  }
}

export async function readStore(): Promise<CricketStore> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_PATH, "utf-8");
  return JSON.parse(raw) as CricketStore;
}

export async function writeStore(store: CricketStore): Promise<void> {
  await ensureStoreFile();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function updateStore(
  updater: (store: CricketStore) => CricketStore
): Promise<CricketStore> {
  const existing = await readStore();
  const updated = updater(existing);
  await writeStore(updated);
  return updated;
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

