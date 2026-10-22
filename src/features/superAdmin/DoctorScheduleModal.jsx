import Modal from "../../components/Modal";
import DoctorScheduleEditor from "./DoctorScheduleEditor";

export const DoctorScheduleModal = ({
  isOpen,
  onClose,
  doctor,
  days,
  onChangeSlot,
  onAddSlot,
  onRemoveSlot,
  onClearDay,
  onApplyPreset,
  onSave,
  saving = false,
  formError,
  saveError,
}) => {
  if (!doctor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Weekly Schedule — ${doctor.fullName ?? doctor.username}`}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <div className="mt-2">
        <DoctorScheduleEditor
          days={days}
          onChangeSlot={onChangeSlot}
          onAddSlot={onAddSlot}
          onRemoveSlot={onRemoveSlot}
          onClearDay={onClearDay}
          onApplyPreset={onApplyPreset}
          onCancel={onClose}
          onSave={onSave}
          saving={saving}
          formError={formError}
          saveError={saveError}
        />
      </div>
    </Modal>
  );
};

export default DoctorScheduleModal;
