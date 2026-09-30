import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as schema from '../schema';

const MIGRATIONS = path.join(__dirname, '..', 'migrations');

/** Carpeta temporal con solo las primeras `count` migraciones (simula una app antigua). */
function partialMigrations(count: number): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
  const journal = JSON.parse(fs.readFileSync(path.join(MIGRATIONS, 'meta', '_journal.json'), 'utf8')) as { entries: { tag: string }[] };
  const entries = journal.entries.slice(0, count);
  fs.mkdirSync(path.join(dir, 'meta'));
  fs.writeFileSync(path.join(dir, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries }));
  for (const entry of entries) fs.copyFileSync(path.join(MIGRATIONS, `${entry.tag}.sql`), path.join(dir, `${entry.tag}.sql`));
  return dir;
}

describe('migraciones', () => {
  it('0002 convierte gastos hormiga en gastos variables', () => {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: partialMigrations(2) });

    const now = '2026-09-30T12:00:00.000Z';
    sqlite
      .prepare("INSERT INTO categories (id, name, icon, color, kind, created_at, updated_at) VALUES ('c1', 'Café', 'coffee', 'clay', 'ant', ?, ?)")
      .run(now, now);
    sqlite
      .prepare("INSERT INTO transactions (id, type, amount, date, category_id, created_at, updated_at) VALUES ('t1', 'ant_expense', 2500, '2026-09-30', 'c1', ?, ?)")
      .run(now, now);

    migrate(db, { migrationsFolder: MIGRATIONS });

    expect(sqlite.prepare("SELECT kind FROM categories WHERE id = 'c1'").get()).toEqual({ kind: 'variable' });
    expect(sqlite.prepare("SELECT type FROM transactions WHERE id = 't1'").get()).toEqual({ type: 'variable_expense' });
  });
});
