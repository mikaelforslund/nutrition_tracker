"use client";

import { Button, StatusLabel, cn } from "@trackerx/ui";
import { ChevronRight, Database, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { loadViewerTables, saveViewerCell } from "@/app/db-viewer-actions";
import type { ViewerRow, ViewerTableData } from "@/lib/db-viewer/repository";
import type { ViewerColumn } from "@/lib/db-viewer/tables";

type Editing = { table: string; rowId: string; column: string; value: string };

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function Disclosure({
  label,
  detail,
  defaultOpen = false,
  children,
}: {
  label: string;
  detail?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 rounded-md py-1.5 text-left text-sm hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <ChevronRight
          aria-hidden
          className={cn("size-4 text-zinc-400 transition-transform", open && "rotate-90")}
        />
        <span className="font-mono font-medium text-zinc-900">{label}</span>
        {detail ? <span className="text-xs text-zinc-500">{detail}</span> : null}
      </button>
      {open ? <div className="pl-5">{children}</div> : null}
    </div>
  );
}

function Cell({
  table,
  row,
  column,
  editing,
  isSaving,
  onEdit,
  onChange,
  onSave,
  onCancel,
}: {
  table: ViewerTableData;
  row: ViewerRow;
  column: ViewerColumn;
  editing: Editing | null;
  isSaving: boolean;
  onEdit: (editing: Editing) => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const rowId = String(row[table.key]);
  const value = row[column.name];
  const text = displayValue(value);
  const isEditing =
    editing?.table === table.name && editing.rowId === rowId && editing.column === column.name;

  if (isEditing) {
    return (
      <td className="p-1">
        <input
          autoFocus
          aria-label={`Edit ${column.name}`}
          value={editing.value}
          disabled={isSaving}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (!isSaving) onCancel();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
            if (event.key === "Escape") onCancel();
          }}
          className="h-7 w-44 rounded border border-accent bg-white px-1.5 font-mono text-xs outline-none"
        />
      </td>
    );
  }

  const content =
    value === null || value === undefined ? (
      <span className="text-zinc-400 italic">null</span>
    ) : (
      <span title={text} className="block max-w-56 truncate">
        {text}
      </span>
    );

  if (!column.editable) {
    return <td className="px-2 py-1.5 text-zinc-500">{content}</td>;
  }

  return (
    <td className="p-0">
      <button
        type="button"
        aria-label={`Edit ${column.name}: ${text || "null"}`}
        onClick={() => onEdit({ table: table.name, rowId, column: column.name, value: text })}
        className="w-full cursor-text rounded px-2 py-1.5 text-left text-zinc-900 hover:bg-accent-track/40 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {content}
      </button>
    </td>
  );
}

export function DbViewer({ revision, asUserId }: { revision: string; asUserId?: string }) {
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState<ViewerTableData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const load = useCallback(() => {
    startLoading(async () => {
      const result = await loadViewerTables(asUserId).catch(() => null);
      if (result?.status === "ok") {
        setTables(result.tables);
      } else {
        setError(result?.message ?? "The database couldn't be read.");
      }
    });
  }, [asUserId]);

  // Data only loads while open, and reloads whenever the dashboard changes it.
  useEffect(() => {
    if (open) load();
  }, [open, revision, load]);

  // Esc inside a cell only cancels that edit, so the panel closes on the next press.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !(event.target instanceof HTMLInputElement)) setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function save() {
    if (!editing) return;
    const { table, column, rowId, value } = editing;

    setError(null);
    startSaving(async () => {
      const result = await saveViewerCell({ table, column, rowId, value }, asUserId).catch(
        () => null,
      );
      if (result?.status === "saved") {
        setEditing(null);
        load();
      } else {
        setError(result?.message ?? "That change couldn't be saved.");
      }
    });
  }

  return (
    <>
      {/* A desktop tool, so it's hidden if the dashboard is opened on a phone. */}
      <Button
        variant="secondary"
        className="hidden lg:inline-flex"
        aria-expanded={open}
        aria-controls="database-panel"
        onClick={() => setOpen(!open)}
      >
        <Database aria-hidden className="size-4" />
        Database
      </Button>

      <aside
        id="database-panel"
        aria-label="Database"
        inert={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-full max-w-4xl flex-col border-l border-zinc-200 bg-white shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "invisible translate-x-full",
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b border-zinc-200 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Database aria-hidden className="size-4 text-zinc-500" />
            Database
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Refresh"
              disabled={isLoading}
              onClick={load}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
            >
              <RefreshCw aria-hidden className={cn("size-4", isLoading && "animate-spin")} />
            </button>
            <button
              type="button"
              aria-label="Close database panel"
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
          <p className="text-xs text-zinc-500">
            Shows the selected person&apos;s rows. Click a dark value to edit it, then press Enter to
            save or Esc to cancel. Leave a value blank to set it to null. Gray columns are read-only.
          </p>
          {error ? (
            <p role="alert">
              <StatusLabel tone="critical">{error}</StatusLabel>
            </p>
          ) : null}
          {tables === null ? (
            <p className="py-4 text-sm text-zinc-500">Loading</p>
          ) : (
            <Disclosure label="app_nutrition" detail={`${tables.length} tables`} defaultOpen>
              {tables.map((table) => (
                <Disclosure
                  key={table.name}
                  label={table.table}
                  detail={`${table.total} ${table.total === 1 ? "row" : "rows"}${
                    table.total > table.rows.length ? `, showing ${table.rows.length}` : ""
                  }`}
                >
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label={`${table.table} rows`}
                    className="max-h-96 overflow-auto rounded-md border border-zinc-200"
                  >
                    <table className="w-full font-mono text-xs whitespace-nowrap">
                      <thead className="sticky top-0 z-10 bg-zinc-50">
                        <tr>
                          {table.columns.map((column) => (
                            <th
                              key={column.name}
                              scope="col"
                              className="border-b border-zinc-200 px-2 py-1.5 text-left font-medium text-zinc-600"
                            >
                              {column.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {table.rows.map((row) => (
                          <tr key={String(row[table.key])}>
                            {table.columns.map((column) => (
                              <Cell
                                key={column.name}
                                table={table}
                                row={row}
                                column={column}
                                editing={editing}
                                isSaving={isSaving}
                                onEdit={(next) => {
                                  setError(null);
                                  setEditing(next);
                                }}
                                onChange={(value) =>
                                  setEditing((current) => current && { ...current, value })
                                }
                                onSave={save}
                                onCancel={() => setEditing(null)}
                              />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Disclosure>
              ))}
            </Disclosure>
          )}
        </div>
      </aside>
    </>
  );
}
