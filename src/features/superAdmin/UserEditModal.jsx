import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import Select from "../../components/Select";
import { ROLES } from "../../constants/roles";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (value) =>
  !EMAIL_PATTERN.test(String(value ?? "").trim())
    ? "Enter a valid email address."
    : "";

const roleLabel = (role) => String(role ?? "").replace(/_/g, " ");

const UserEditModal = ({
  isOpen,
  onClose,
  targetUser,
  editForm,
  onChange,
  onSubmit,
  isSubmitting,
  error,
  attempted,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={targetUser ? `Edit — ${targetUser.username}` : "Edit Account"}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorMessage title="Update Failed" message={error} />}
        <Input
          id="edit-email"
          name="email"
          label="Clinic Email Address"
          type="email"
          value={editForm.email}
          onChange={onChange}
          required
          validate={validateEmail}
          submitted={attempted}
          placeholder="staff@onecare.clinic"
        />
        <Select
          id="edit-role"
          name="role"
          label="Role Clearance"
          options={Object.values(ROLES).map((r) => ({
            value: r,
            label: roleLabel(r),
          }))}
          value={editForm.role}
          onChange={onChange}
          required
          submitted={attempted}
        />
        <p className="rounded-lg border border-neutral-100 bg-neutral-50 p-2.5 text-xs text-neutral-500">
          Role revisions take effect on subsequent authentication updates or
          token refreshes.
        </p>
        <div className="mt-6 flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserEditModal;
