import { memo } from "react";

import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import { Panel } from "../../components/doctor/Panel";

/** Backend limit: clinical notes are capped at 2000 characters. */
export const CLINICAL_NOTES_MAX_LENGTH = 2000;

/**
 * Clinical Examination & Notes panel.
 *
 * Handles both the editable (active consultation) and read-only
 * (completed / cancelled) states.  All state lives in the parent
 * (ConsultationPage) — this component is purely presentational.
 *
 * @param {object}   props
 * @param {string}   props.notes            Current notes value.
 * @param {boolean}  props.isClosed         True when appointment is COMPLETED or CANCELLED.
 * @param {string}   props.appointmentStatus The raw status string ("COMPLETED", "CANCELLED", …).
 * @param {boolean}  props.notesSaving       True while a save request is in flight.
 * @param {boolean}  props.notesDirty        True when the textarea has unsaved edits.
 * @param {string|null} props.notesError     Inline error message from the last save attempt.
 * @param {Function} props.onNotesChange     onChange handler for the textarea.
 * @param {Function} props.onSaveNotes       Called when the user clicks "Save Notes".
 */
const ClinicalNotesPanel = memo(function ClinicalNotesPanel({
  notes,
  isClosed,
  appointmentStatus,
  notesSaving,
  notesDirty,
  notesError,
  onNotesChange,
  onSaveNotes,
}) {
  const notesLength = notes.length;
  const notesNearLimit = notesLength >= CLINICAL_NOTES_MAX_LENGTH * 0.9;

  return (
    <Panel
      icon="clipboard"
      title="Clinical Examination & Notes"
      titleId="clinical-notes-heading"
      aside={
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
            notesNearLimit
              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {notesLength}/{CLINICAL_NOTES_MAX_LENGTH}
        </span>
      }
      bodyClassName="space-y-3"
    >
      {isClosed ? (
        <>
          <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
            <Icon
              name="lock"
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400"
            />
            <p>
              {appointmentStatus === "CANCELLED"
                ? "Clinical notes cannot be added to a cancelled appointment."
                : "This consultation is completed; its clinical notes are read-only."}
            </p>
          </div>

          {appointmentStatus === "COMPLETED" && notes.trim() && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                {notes}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="relative">
            <textarea
              id="clinical-notes"
              aria-labelledby="clinical-notes-heading"
              rows={7}
              maxLength={CLINICAL_NOTES_MAX_LENGTH}
              value={notes}
              onChange={onNotesChange}
              className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 text-sm leading-relaxed text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="Diagnosis, advice, follow-up..."
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-400">
              Notes are saved separately from completing the visit.
            </p>
            <Button
              onClick={onSaveNotes}
              loading={notesSaving}
              disabled={notesSaving || !notesDirty}
              size="sm"
              variant="outline"
            >
              Save Notes
            </Button>
          </div>
        </>
      )}

      {notesError && <ErrorMessage message={notesError} />}
    </Panel>
  );
});

export default ClinicalNotesPanel;
