const completed = (status) =>
  ["DISPENSED", "PARTIALLY_DISPENSED"].includes(status);
const quantity = (value) =>
  Number.isInteger(value) && value >= 0 ? value : null;

// Deliberately allow-list dispensing fields: no clinical notes or diagnosis.
export function adaptInHouseDispensing(record) {
  const items = (record.items ?? [])
    .filter((item) => item.itemType === "IN_HOUSE")
    .map((item) => ({
      name: item.medicineName || `Medicine ${item.medicineId}`,
      quantity:
        record.status === "DISPENSED" &&
        item.quantityDispensed === 0 &&
        item.unitPrice == null
          ? null
          : quantity(item.quantityDispensed),
    }));
  return {
    id: `prescription-${record.prescriptionId}`,
    type: "In-house",
    dispensedAt: record.dispensedAt ?? null,
    patientId: record.patientId ?? null,
    prescriptionId: record.prescriptionId,
    appointmentId: record.appointmentId ?? null,
    status: record.status,
    items,
    dispenseId: null,
  };
}

export function adaptExternalDispensing(record, prescription) {
  return {
    id: `dispense-${record.dispenseId}`,
    type: record.inHouse ? "In-house" : "External",
    dispensedAt: record.dispensedAt ?? null,
    patientId: record.patientId ?? null,
    prescriptionId: record.prescriptionId ?? null,
    status: record.status,
    dispenseId: record.dispenseId,
    items: (record.items ?? []).filter(Boolean).map((item) => ({
      name:
        (prescription?.items ?? []).find(
          (line) => line.itemId === item.prescriptionItemId,
        )?.medicineName || `Medicine ${item.medicineId ?? "not recorded"}`,
      quantity: quantity(item.quantityDispensed),
    })),
  };
}

export function mergeDispensingHistory(prescriptions, events) {
  const byPrescription = new Map(
    prescriptions.map((record) => [String(record.prescriptionId), record]),
  );
  const handedOver = events.filter((event) => completed(event.status));
  const represented = new Set(
    handedOver
      .filter((event) => event.prescriptionId != null)
      .map((event) => String(event.prescriptionId)),
  );
  return [
    ...handedOver.map((event) =>
      adaptExternalDispensing(
        event,
        byPrescription.get(String(event.prescriptionId)),
      ),
    ),
    ...prescriptions
      .filter(
        (record) =>
          completed(record.status) &&
          !represented.has(String(record.prescriptionId)) &&
          (record.items ?? []).some(
            (item) =>
              item.itemType === "IN_HOUSE" &&
              (record.status === "DISPENSED" || item.quantityDispensed > 0),
          ),
      )
      .map(adaptInHouseDispensing),
  ].sort(
    (a, b) =>
      String(b.dispensedAt ?? "").localeCompare(String(a.dispensedAt ?? "")) ||
      b.id.localeCompare(a.id, undefined, { numeric: true }),
  );
}
