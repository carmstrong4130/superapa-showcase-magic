import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Loader2, X, Camera, Check } from "lucide-react";
import { extractFuelLog, saveFuelLogRows } from "@/lib/fuel-log.functions";
import { unresolvedFields, type DraftRow, type NumericField } from "@/lib/dagger-data";
import { tripRowsQueryOptions } from "@/lib/sheet.functions";

/** Blank means "still unknown" — it must never quietly become 0. */
function parseCell(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}

export function AddFuelLogButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add fuel log from photo"
        className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/40 transition hover:bg-primary/25"
      >
        <Plus className="h-5 w-5" />
      </button>
      {open && <AddFuelLogDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AddFuelLogDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const extract = useServerFn(extractFuelLog);
  const save = useServerFn(saveFuelLogRows);
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    setRows(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      setStatus("reading");
      const res = await extract({ data: { imageDataUrl: dataUrl } });
      setRows(res.rows);
      setStatus("idle");
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "Something went wrong reading that photo.");
    }
  }

  /** Re-checks the row's flags after an edit: typing a value clears its warning. */
  function updateRow(i: number, patch: Partial<DraftRow>) {
    setRows(
      (prev) =>
        prev?.map((r, idx) => {
          if (idx !== i) return r;
          const next = { ...r, ...patch };
          const edited = Object.keys(patch) as Array<keyof DraftRow>;
          next.computedFields = next.computedFields.filter((f) => !edited.includes(f));
          next.uncertainFields = unresolvedFields(next);
          return next;
        }) ?? prev,
    );
  }

  async function onSave() {
    if (!rows?.length) return;
    setError(null);
    setStatus("saving");
    try {
      await save({ data: { rows, imageDataUrl: preview ?? undefined } });
      await queryClient.invalidateQueries({ queryKey: ["fuel-log-batches"] });
      await queryClient.invalidateQueries({ queryKey: tripRowsQueryOptions.queryKey });
      setStatus("saved");
      setTimeout(onClose, 700);
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "Couldn't save those rows.");
    }
  }

  const busy = status === "reading" || status === "saving";
  const unreadableRows = rows?.filter((r) => r.uncertainFields.length > 0).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Add fuel log from photo">
      <div className="panel flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Log intake</div>
            <h2 className="text-lg font-semibold">Add fill-ups from a photo</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />

          {!preview && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 py-12 text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
            >
              <Camera className="h-7 w-7" />
              <span className="text-sm">Take or choose a photo of your fuel log</span>
              <span className="font-mono text-[10px] uppercase tracking-widest">JPG · PNG · HEIC-converted</span>
            </button>
          )}

          {preview && (
            <div className="flex items-start gap-4">
              <img src={preview} alt="Uploaded fuel log" className="h-28 w-28 rounded-md object-cover ring-1 ring-border" />
              <button type="button" onClick={() => inputRef.current?.click()} className="text-sm text-primary hover:underline" disabled={busy}>
                Choose a different photo
              </button>
            </div>
          )}

          {status === "reading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading the log…
            </div>
          )}

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {rows && rows.length > 0 && (
            <div className="overflow-x-auto">
              <p className="mb-2 text-sm text-muted-foreground">
                Found {rows.length} {rows.length === 1 ? "row" : "rows"}. Check the numbers, edit anything that's off, then save.
              </p>
              {unreadableRows > 0 && (
                <p className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {unreadableRows === 1
                    ? "1 row has a value the photo didn't show clearly"
                    : `${unreadableRows} rows have values the photo didn't show clearly`}
                  , marked in red. Type them in — nothing saves until they're filled.
                </p>
              )}
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
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <Cell value={r.date} type="date" onChange={(v) => updateRow(i, { date: v })} />
                      <Cell value={r.miles} type="number" flag={flagFor(r, "miles")} onChange={(v) => updateRow(i, { miles: parseCell(v) })} />
                      <Cell value={r.gallons} type="number" flag={flagFor(r, "gallons")} onChange={(v) => updateRow(i, { gallons: parseCell(v) })} />
                      <Cell value={r.pricePerGallon} type="number" flag={flagFor(r, "pricePerGallon")} onChange={(v) => updateRow(i, { pricePerGallon: parseCell(v) })} />
                      <Cell value={r.totalCost} type="number" flag={flagFor(r, "totalCost")} onChange={(v) => updateRow(i, { totalCost: parseCell(v) })} />
                      <Cell value={r.trip} type="text" onChange={(v) => updateRow(i, { trip: v.toUpperCase() })} />
                      <td className="py-1 text-right">
                        <button
                          type="button"
                          aria-label={`Remove row ${i + 1}`}
                          className="rounded p-1 text-muted-foreground hover:text-destructive"
                          onClick={() => setRows((prev) => prev?.filter((_, idx) => idx !== i) ?? prev)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-4">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!rows?.length || busy || status === "saved" || unreadableRows > 0}
            title={unreadableRows > 0 ? "Fill in the cells marked in red first" : undefined}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
          >
            {status === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === "saved" && <Check className="h-4 w-4" />}
            {status === "saved" ? "Added" : `Add ${rows?.length ?? 0} to log`}
          </button>
        </div>
      </div>
    </div>
  );
}

type CellFlag = "unreadable" | "computed" | undefined;

function flagFor(row: DraftRow, field: NumericField): CellFlag {
  if (row.uncertainFields.includes(field)) return "unreadable";
  if (row.computedFields.includes(field)) return "computed";
  return undefined;
}

const FLAG_STYLES: Record<"unreadable" | "computed", string> = {
  unreadable: "border-destructive bg-destructive/10 focus:border-destructive",
  computed: "border-primary/50 bg-primary/5 focus:border-primary",
};

const FLAG_TITLES: Record<"unreadable" | "computed", string> = {
  unreadable: "Couldn't read this from the photo — type it in",
  computed: "Calculated from the other two money columns — worth a glance",
};

function Cell({
  value,
  type,
  flag,
  onChange,
}: {
  value: string | number | null;
  type: "text" | "number" | "date";
  flag?: CellFlag;
  onChange: (v: string) => void;
}) {
  return (
    <td className="py-1 pr-2">
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value ?? ""}
        placeholder={flag === "unreadable" ? "?" : undefined}
        aria-invalid={flag === "unreadable" || undefined}
        title={flag ? FLAG_TITLES[flag] : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full min-w-[5.5rem] rounded border px-2 py-1 text-sm outline-none ${
          flag ? FLAG_STYLES[flag] : "border-border/60 bg-background/60 focus:border-primary"
        }`}
      />
    </td>
  );
}
