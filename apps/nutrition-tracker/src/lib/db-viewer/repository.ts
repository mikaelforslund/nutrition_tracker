import "server-only";
import type { TransactionSql } from "postgres";
import { getSql, withUser } from "../db";
import { getEnv } from "../env";
import {
  VIEWER_TABLES,
  maskSecret,
  type CellEdit,
  type ColumnType,
  type ViewerColumn,
  type ViewerTable,
} from "./tables";

const ROW_LIMIT = 200;

export type ViewerRow = Record<string, unknown>;

export type ViewerTableData = {
  name: string;
  schema: string;
  table: string;
  key: string;
  columns: readonly ViewerColumn[];
  total: number;
  rows: ViewerRow[];
};

async function readTable(sql: TransactionSql, viewerTable: ViewerTable): Promise<ViewerTableData> {
  const { schema, table, key, orderBy, columns } = viewerTable;
  const name = `${schema}.${table}`;

  const [count] = await sql<{ total: number }[]>`
    select count(*)::int as total from ${sql(name)}
  `;
  // orderBy comes from the VIEWER_TABLES constant, never from a request.
  const rows = await sql<{ row: ViewerRow }[]>`
    select to_jsonb(t) as row
    from ${sql(name)} t
    order by ${sql.unsafe(orderBy)}
    limit ${ROW_LIMIT}
  `;

  return {
    name,
    schema,
    table,
    key,
    columns,
    total: count?.total ?? 0,
    rows: maskSecret(viewerTable, rows.map(({ row }) => row)),
  };
}

/**
 * With mock auth the viewer is a local admin tool, so it reads everyone's rows as the
 * server. Otherwise withUser applies row level security and server-only tables stay out.
 */
export async function readViewerTables(userId: string): Promise<ViewerTableData[]> {
  const readAll = async (tx: TransactionSql, visible: readonly ViewerTable[]) => {
    const tables: ViewerTableData[] = [];
    for (const table of visible) tables.push(await readTable(tx, table));
    return tables;
  };

  if (getEnv().AUTH_MODE === "mock") {
    return (await getSql().begin((tx) => readAll(tx, VIEWER_TABLES))) as ViewerTableData[];
  }
  return withUser(userId, (tx) => readAll(tx, VIEWER_TABLES.filter((table) => !table.serverOnly)));
}

function typedValue(tx: TransactionSql, type: ColumnType, value: string | null) {
  switch (type) {
    case "integer":
      return tx`${value}::integer`;
    case "numeric":
      return tx`${value}::numeric`;
    case "timestamptz":
      return tx`${value}::timestamptz`;
    case "uuid":
      return tx`${value}::uuid`;
    case "text":
      return tx`${value}::text`;
  }
}

async function updateCell(tx: TransactionSql, { table, column, rowId, value }: CellEdit): Promise<boolean> {
  const updated = await tx`
    update ${tx(`${table.schema}.${table.table}`)}
    set ${tx(column.name)} = ${typedValue(tx, column.type, value)}
    where ${tx(table.key)} = ${rowId}::uuid
    returning 1
  `;
  return updated.length > 0;
}

/** Returns false if no visible row matched. The edit must come from parseCellEdit. */
export async function updateViewerCell(userId: string, edit: CellEdit): Promise<boolean> {
  if (getEnv().AUTH_MODE === "mock") {
    return (await getSql().begin((tx) => updateCell(tx, edit))) as boolean;
  }
  return withUser(userId, (tx) => updateCell(tx, edit));
}
