export type MigrationDefinition = {
  readonly name: string;
  readonly up: readonly string[];
  readonly down: readonly string[];
};

export const tenantPolicy = (table: string): readonly string[] => [
  `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`,
  `CREATE POLICY ${table}_tenant ON ${table} USING (tenant = current_setting('app.current_tenant', true)) WITH CHECK (tenant = current_setting('app.current_tenant', true))`,
];
