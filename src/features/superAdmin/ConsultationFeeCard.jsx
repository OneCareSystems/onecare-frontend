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
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Icon name="banknote" className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Consultation fee
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Applies to new invoices only.
            </p>
          </div>
        </div>
        {status === "ready" && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Live
          </span>
        )}
      </div>

      {status === "loading" ? (
        <div className="mt-4 animate-pulse space-y-3">
          <div className="h-4 w-40 rounded bg-neutral-100" />
          <div className="h-10 rounded-lg bg-neutral-100" />
        </div>
      ) : status === "failed" ? (
        <div className="mt-4 space-y-3">
          <ErrorMessage title="Unable to load fee" message={error} />
          <Button variant="outline" size="sm" onClick={onRetry}>
            <Icon name="refresh" className="mr-1 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : (
        <form onSubmit={onSave} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="consultation-fee"
                className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
              >
                Amount
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400">
                  $
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
                  className="block w-full rounded-lg border border-neutral-200 bg-white py-2 pl-7 pr-3 text-sm text-neutral-900 shadow-xs transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-neutral-50"
                />
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                {fee !== saved ? (
                  <span className="text-amber-600">Unsaved change</span>
                ) : (
                  "Currently active"
                )}
              </p>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-danger-50 p-2 text-xs text-danger-800 ring-1 ring-inset ring-danger-200">
              {error}
            </p>
          )}

          <div className="flex justify-end border-t border-neutral-100 pt-3">
            <Button
              type="submit"
              size="sm"
              loading={saving}
              disabled={saving || fee.trim() === "" || fee === saved}
              className="inline-flex items-center gap-1.5"
            >
              <Icon name="save" className="h-3.5 w-3.5" />
              Save fee
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};

export default ConsultationFeeCard;
