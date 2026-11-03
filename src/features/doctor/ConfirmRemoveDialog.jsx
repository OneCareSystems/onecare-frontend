import Button from "../../components/Button";
import Icon from "../../components/Icon";
import Modal from "../../components/doctor/Modal";

/**
 * Confirm-remove dialog for Knowledge Base documents.
 *
 * Uses the doctor-specific `Modal` (aria-managed, focus-trapped) and
 * follows the same pattern as other doctor-module confirm flows.
 *
 * @param {object}   props
 * @param {object}   props.doc       The document pending removal.
 * @param {Function} props.onCancel  Called when the user dismisses without confirming.
 * @param {Function} props.onConfirm Called when the user confirms removal.
 * @param {boolean}  props.removing  True while the delete request is in-flight.
 * @param {string|null} props.error  Inline error from a failed remove attempt.
 */
const ConfirmRemoveDialog = ({ doc, onCancel, onConfirm, removing, error }) => (
  <Modal title="Remove reference" onClose={onCancel} widthClass="max-w-md">
    <p className="text-sm text-neutral-700">
      Remove <span className="font-semibold">{doc.title}</span> from the
      knowledge base? The chatbot will no longer reference this document.
    </p>
    {error && (
      <p
        role="alert"
        className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700"
      >
        {error}
      </p>
    )}
    <div className="mt-5 flex justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onCancel}
        disabled={removing}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={onConfirm}
        loading={removing}
        disabled={removing}
        className="inline-flex items-center gap-1.5"
      >
        <Icon name="trash" className="h-4 w-4" />
        {removing ? "Removing…" : "Remove"}
      </Button>
    </div>
  </Modal>
);

export default ConfirmRemoveDialog;
