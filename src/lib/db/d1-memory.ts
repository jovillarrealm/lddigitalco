import { DatabaseSync } from 'node:sqlite';
import type { D1Database, D1PreparedStatement, D1Result, D1ExecResult } from './types';

class MemoryPreparedStatement implements D1PreparedStatement {
  private values: any[] = [];

  constructor(
    private rawDb: DatabaseSync,
    private query: string,
    values: any[] = []
  ) {
    this.values = values;
  }

  bind(...values: any[]): D1PreparedStatement {
    return new MemoryPreparedStatement(this.rawDb, this.query, values);
  }

  async first<T = Record<string, any>>(colName?: string): Promise<T | null> {
    const stmt = this.rawDb.prepare(this.query);
    const row = stmt.get(...this.values) as Record<string, any> | undefined;
    if (!row) {
      return null;
    }
    if (colName) {
      return (row[colName] ?? null) as T;
    }
    return row as T;
  }

  async run<T = Record<string, any>>(): Promise<D1Result<T>> {
    const startTime = performance.now();
    const stmt = this.rawDb.prepare(this.query);
    const result = stmt.run(...this.values);
    const duration = performance.now() - startTime;

    return {
      results: [],
      success: true,
      meta: {
        duration,
        changes: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid),
      },
    };
  }

  async all<T = Record<string, any>>(): Promise<D1Result<T>> {
    const startTime = performance.now();
    const stmt = this.rawDb.prepare(this.query);
    const rows = stmt.all(...this.values) as T[];
    const duration = performance.now() - startTime;

    return {
      results: rows,
      success: true,
      meta: {
        duration,
        changes: 0,
        last_row_id: 0,
      },
    };
  }

  async raw<T = any[]>(): Promise<T[]> {
    const stmt = this.rawDb.prepare(this.query);
    const rows = stmt.all(...this.values) as Record<string, any>[];
    return rows.map((row) => Object.values(row)) as T[];
  }
}

export class MemoryD1Database implements D1Database {
  private rawDb: DatabaseSync;

  constructor(filePath: string = ':memory:') {
    this.rawDb = new DatabaseSync(filePath);
  }

  prepare(query: string): D1PreparedStatement {
    return new MemoryPreparedStatement(this.rawDb, query);
  }

  async exec(query: string): Promise<D1ExecResult> {
    const startTime = performance.now();
    this.rawDb.exec(query);
    const duration = performance.now() - startTime;
    return {
      count: 1,
      duration,
    };
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const stmt of statements) {
      const res = await (stmt as MemoryPreparedStatement).run<T>();
      results.push(res);
    }
    return results;
  }

  async dump(): Promise<ArrayBuffer> {
    throw new Error('dump() is not supported in MemoryD1Database');
  }

  getRaw(): DatabaseSync {
    return this.rawDb;
  }
}

export function createInMemoryD1(): MemoryD1Database {
  return new MemoryD1Database(':memory:');
}
