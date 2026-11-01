declare module "node:sqlite" {
  export type SQLInputValue = null | number | bigint | string | ArrayBufferView;
  export type RunResult = { lastInsertRowid: number | bigint; changes: number };
  export class StatementSync {
    all(...params: SQLInputValue[]): Record<string, unknown>[];
    get(...params: SQLInputValue[]): Record<string, unknown> | undefined;
    run(...params: SQLInputValue[]): RunResult;
  }
  export class DatabaseSync {
    constructor(path: string, options?: { allowExtension?: boolean });
    exec(sql: string): void;
    loadExtension(file: string, entrypoint?: string): void;
    prepare(sql: string): StatementSync;
  }
}
