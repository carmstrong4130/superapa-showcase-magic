import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronRight, ClipboardList, ImageIcon, Loader2, Trash2, X, Check } from "lucide-react";
import {
  listFuelLogs,
  updateFuelLogRow,
  deleteFuelLogRow,
  deleteFuelLogBatchFn,
  type ExtractedRow,
  type FuelLogBatch,
} from "@/lib/fuel-log.functions";
import { tripRowsQueryOptions } from "@/lib/sheet.functions";

export function ManageFuelLogsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Review uploaded fuel logs"
        className="grid h-10 w-10 place-items-center rounded-lg bg-muted/40 text-muted-foreground ring-1 ring-border transition hover:text-foreground"
      >
        <ClipboardList className="h-5 w-5" />
      </button>
      {open && <ManageFuelLogsDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function ManageFuelLogsDialog({ onClose }: { onClose: () => void }) {
  const list = useServerFn(listFuelLogs);
  const { data, isLoading, error } = useQuery({
    queryKey: ["fuel-log-batches"],
    queryFn: () => list(),
  });

  const batches = data?.batches ?? [];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Uploaded fuel logs"
    >
      <div className="panel flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Source data</div>
            <h2 className="text-lg font-semibold">Uploaded fuel logs</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {isLoading && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading uploads…
            </div>
          )}
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error instanceof Error ? error.message : "Couldn't load your uploads."}
            </p>
          )}
          {!isLoading && !error && batches.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No photo uploads yet. Use the + button to add one.
            </p>
          )}
          {batches.map((b) => (
            <BatchCard key={b.id} batch={b} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BatchCard({ batch }: { batch: FuelLogBatch }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const removeBatch = useServerFn(deleteFuelLogBatchFn);

  const del = useMutation({
    mutationFn: () => removeBatch({ data: { id: batch.id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fuel-log-batches"] });
      await queryClient.invalidateQueries({ queryKey: tripRowsQueryOptions.queryKey });
    },
  });

  return (
    <div className="rounded-lg border border-border/60">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          {open ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <div>
            <div className="text-sm font-medium">{batch.label}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {batch.rowCount} {batch.rowCount === 1 ? "fill-up" : "fill-ups"}
            </div>
          </div>
        </button>
        {batch.imageUrl && (
          <a
            href={batch.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ImageIcon className="h-3.5 w-3.5" /> Photo
          </a>
        )}
        <button
          type="button"
          onClick={() => del.mutate()}
          disabled={del.isPending}
          aria-label={`Delete upload ${batch.label}`}
          className="rounded-md p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
        >
          {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border/50 px-3 py-3">
          {batch.imageUrl && (
            <img src={batch.imageUrl} alt={`Fuel log photo for ${batch.label}`} className="max-h-64 rounded-md object-contain ring-1 ring-border" />
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Miles</th>
                  <th className="py-2 pr-2">Gal</th>
                  <th className="py-2 pr-2">$/Gal</th>
                  <th className="py-2 pr-2">Cost</th>
                  <th className="py-2 pr-2">Trip</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {batch.rows.map((r) => (
                  <EditableRow key={r.id} row={r} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableRow({ row }: { row: ExtractedRow & { id: string } }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ExtractedRow>(row);
  const update = useServerFn(updateFuelLogRow);
  const remove = useServerFn(deleteFuelLogRow);

  const dirty =
    draft.date !== row.date ||
    draft.miles !== row.miles ||
    draft.gallons !== row.gallons ||
    draft.pricePerGallon !== row.pricePerGallon ||
    draft.totalCost !== row.totalCost ||
    draft.trip !== row.trip;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["fuel-log-batches"] });
    await queryClient.invalidateQueries({ queryKey: tripRowsQueryOptions.queryKey });
  };

  const save = useMutation({
    mutationFn: () => update({ data: { id: row.id, row: draft } }),
    onSuccess: invalidate,
  });
  const del = useMutation({
    mutationFn: () => remove({ data: { id: row.id } }),
    onSuccess: invalidate,
  });

  const set = (patch: Partial<ExtractedRow>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <tr className="border-b border-border/30">
      <Cell value={draft.date} type="date" onChange={(v) => set({ date: v })} />
      <Cell value={draft.miles} type="number" onChange={(v) => set({ miles: Number(v) || 0 })} />
      <Cell value={draft.gallons} type="number" onChange={(v) => set({ gallons: Number(v) || 0 })} />
      <Cell value={draft.pricePerGallon} type="number" onChange={(v) => set({ pricePerGallon: Number(v) || 0 })} />
      <Cell value={draft.totalCost} type="number" onChange={(v) => set({ totalCost: Number(v) || 0 })} />
      <Cell value={draft.trip} type="text" onChange={(v) => set({ trip: v.toUpperCase() })} />
      <td className="whitespace-nowrap py-1 text-right">
        {dirty && (
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            aria-label="Save changes to this row"
            className="rounded p-1 text-primary hover:brightness-125"
          >
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => del.mutate()}
          disabled={del.isPending}
          aria-label="Delete this row"
          className="rounded p-1 text-muted-foreground hover:text-destructive"
        >
          {del.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </td>
    </tr>
  );
}

function Cell({ value, type, onChange }: { value: string | number; type: "text" | "number" | "date"; onChange: (v: string) => void }) {
  return (
    <td className="py-1 pr-2">
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-[5.5rem] rounded border border-border/60 bg-background/60 px-2 py-1 text-sm outline-none focus:border-primary"
      />
    </td>
  );
}
