import { useState } from "react";
import { CheckCircle2, Download, Loader2, XCircle, Wrench } from "lucide-react";
import { apiFetch } from "../../lib/api";

type DiagnosticPayload = {
  overall: "PASS" | "WARN" | "FAIL" | string;
  diagnostic_version?: string;
  timestamp?: string;
  duration_ms?: number;
  checks?: Record<string, unknown>;
  error?: string;
};

function flattenStatus(check: unknown): string | null {
  if (!check || typeof check !== "object") return null;
  const value = (check as { status?: unknown }).status;
  return typeof value === "string" ? value : null;
}

export default function DiagnosticsDrawer({ onRecorded }: { onRecorded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = (await apiFetch("/api/diagnostics")) as DiagnosticPayload;
      setResult(payload);
      setOpen(true);

      try {
        await apiFetch("/api/admin/actions", {
          method: "POST",
          body: JSON.stringify({
            action_type: "run_diagnostics",
            target_type: "system",
            details: {
              result: payload.overall,
              diagnostic_version: payload.diagnostic_version ?? null,
              duration_ms: payload.duration_ms ?? null,
              timestamp: payload.timestamp ?? null,
              failed_checks: Object.entries(payload.checks ?? {})
                .filter(([, value]) => flattenStatus(value) === "FAIL")
                .map(([key]) => key),
            },
          }),
        });
        onRecorded?.();
      } catch {
        // Diagnostic results remain useful even if audit recording fails.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run diagnostics.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `buymesho-diagnostics-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void run()}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-bold text-bm-text dark:text-bm-text-muted transition hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
        Diagnostics
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] bg-black/20" onClick={() => setOpen(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-bm-surface shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-bm-border dark:border-bm-border bg-bm-surface px-5 py-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">System check</p>
                <h2 className="mt-1 text-xl font-black text-bm-text dark:text-bm-text">Diagnostics</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-bm-text-subtle dark:text-bm-text-subtle hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted hover:text-bm-text"
                aria-label="Close diagnostics"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5">
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
              ) : result ? (
                <>
                  <div className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle p-4">
                    <div className="flex items-center gap-3">
                      {result.overall === "PASS" ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-rose-600" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-bm-text dark:text-bm-text">{result.overall}</p>
                        <p className="text-xs text-bm-text-subtle dark:text-bm-text-subtle">
                          {result.duration_ms != null ? `${result.duration_ms} ms` : "—"}
                          {result.timestamp ? ` · ${new Date(result.timestamp).toLocaleString()}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(result.checks ?? {}).map(([key, value]) => {
                      const status = flattenStatus(value);
                      return (
                        <div key={key} className="rounded-xl border border-bm-border dark:border-bm-border px-3 py-2">
                          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-bm-text-subtle dark:text-bm-text-subtle">{key}</p>
                          <p className="mt-1 text-sm font-bold text-bm-text dark:text-bm-text">{status ?? "—"}</p>
                        </div>
                      );
                    })}
                  </div>

                  <details className="rounded-2xl border border-bm-border dark:border-bm-border">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-bm-text dark:text-bm-text-muted">View JSON</summary>
                    <pre className="max-h-[55vh] overflow-auto border-t border-bm-border dark:border-bm-border bg-zinc-950 p-4 text-xs text-zinc-100">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>

                  <button
                    type="button"
                    onClick={download}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-bm-brand px-4 py-3 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover"
                  >
                    <Download className="h-4 w-4" />
                    Download JSON
                  </button>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
