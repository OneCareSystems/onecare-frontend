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

const UserCreateModal = ({
  isOpen,
  onClose,
  form,
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
      title="Create New User"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorMessage title="Creation Failed" message={error} />}

        <Input
          id="username"
          name="username"
          label="Staff ID / Username"
          value={form.username}
          onChange={onChange}
          required
          submitted={attempted}
          placeholder="e.g. PENDELTON-3312"
        />
        <Input
          id="email"
          name="email"
          label="Clinic Email Address"
          type="email"
          value={form.email}
          onChange={onChange}
          required
          validate={validateEmail}
          submitted={attempted}
          placeholder="staff@onecare.clinic"
          hint="An onboarding password activation key will be dispatched to this email address."
        />
        <Input
          id="password"
          name="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={onChange}
          required
          submitted={attempted}
          placeholder="e.g. **********"
        />
        <Select
          id="role"
          name="role"
          label="Role Clearance"
          options={Object.values(ROLES).map((r) => ({
            value: r,
            label: roleLabel(r),
          }))}
          value={form.role}
          onChange={onChange}
          required
          submitted={attempted}
        />
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
            Create Account
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserCreateModal;
