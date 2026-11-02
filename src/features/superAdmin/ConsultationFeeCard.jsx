import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";

export const ConsultationFeeCard = ({
  status,
  fee,
  setFee,
  saved,
  saving,
  error,
  onSave,
  onRetry,
}) => {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
            <Icon name="banknote" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 leading-tight">
              Consultation Fee
            </h2>
            <p className="text-[11px] text-neutral-500">
              Applies to new invoices only
            </p>
          </div>
        </div>
        {status === "ready" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* States */}
      {status === "loading" ? (
        <div className="mt-3.5 animate-pulse flex items-center gap-3">
          <div className="h-9 flex-1 rounded-lg bg-neutral-100" />
          <div className="h-9 w-20 rounded-lg bg-neutral-100" />
        </div>
      ) : status === "failed" ? (
        <div className="mt-3.5 space-y-2.5">
          <ErrorMessage title="Unable to load fee" message={error} />
          <Button variant="outline" size="sm" onClick={onRetry}>
            <Icon name="refresh" className="mr-1 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : (
        <form onSubmit={onSave} className="mt-3.5 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Input Group */}
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                Rs.
              </span>
              <input
                id="consultation-fee"
                name="consultationFee"
                type="number"
                min="0"
                step="0.01"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                disabled={saving}
                required
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-50/50 py-2 pl-9 pr-3 text-xs font-medium text-neutral-900 shadow-2xs transition focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-neutral-50"
                placeholder="0.00"
              />
            </div>

            {/* Save Button & Status indicator */}
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-[11px] font-medium">
                {fee !== saved ? (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Unsaved
                  </span>
                ) : (
                  <span className="text-neutral-400">Up to date</span>
                )}
              </span>

              <Button
                type="submit"
                size="sm"
                loading={saving}
                disabled={saving || !String(fee).trim() || fee === saved}
                className="inline-flex items-center gap-1 shadow-2xs"
              >
                <Icon name="save" className="h-3.5 w-3.5" />
                Save
              </Button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-800 ring-1 ring-inset ring-rose-200">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
};

export default ConsultationFeeCard;