
import { afterEach, describe, expect, it } from "vitest";
import {
  searchMedicines,
  getLowStockMedicines,
  getNearExpiryMedicines,
  adjustMedicineStock,
  createMedicine,
} from "../../src/services/medicineService";
import { mswState, resetMswState } from "../msw/handlers";

const medicines = [
  {
    medicineId: 1,
    name: "Paracetamol",
    stockQuantity: 50,
    reorderLevel: 10,
    expiryDate: "2027-12-31",
  },
  {
    medicineId: 2,
    name: "Amoxicillin",
    stockQuantity: 5,
    reorderLevel: 10,
    expiryDate: "2026-11-01",
  },
];

afterEach(() => {
  resetMswState();
});

describe("medicineService", () => {
  it("creates a medicine without sending initial stock", async () => {
  const medicine = {
    name: "Paracetamol",
    genericName: "Acetaminophen",
    category: "Analgesic",
    unit: "tablet",
    price: "125.50",
    expiryDate: "2027-12-31",
    reorderLevel: "10",
  };

  mswState.medicineCreateResponses.push({
    medicineId: 101,
    ...medicine,
    price: 125.5,
    stockQuantity: 0,
  });

  const result = await createMedicine(medicine);

  expect(result).toMatchObject({
    medicineId: 101,
    name: "Paracetamol",
    stockQuantity: 0,
  });

  expect(mswState.medicineCreateHits).toHaveLength(1);

  const requestBody = mswState.medicineCreateHits[0].body;

  expect(requestBody).toMatchObject({
    name: "Paracetamol",
    genericName: "Acetaminophen",
    category: "Analgesic",
    unit: "tablet",
    price: "125.50",
    expiryDate: "2027-12-31",
    reorderLevel: 10,
  });

  expect(requestBody).not.toHaveProperty("stockQuantity");
});


  it("creates a medicine and starts with zero stock", async () => {
    const medicine = {
      name: "Paracetamol",
      genericName: "Acetaminophen",
      category: "Analgesic",
      unit: "tablet",
      price: "125.50",
      expiryDate: "2027-12-31",
      reorderLevel: "10",
    };

    mswState.medicineCreateResponses.push({
      medicineId: 101,
      name: medicine.name,
      genericName: medicine.genericName,
      category: medicine.category,
      unit: medicine.unit,
      price: 125.5,
      expiryDate: medicine.expiryDate,
      reorderLevel: 10,
      stockQuantity: 0,
      isQuarantined: false,
    });

    const result = await createMedicine(medicine);

    expect(result).toMatchObject({
      medicineId: 101,
      name: "Paracetamol",
      stockQuantity: 0,
    });

    expect(mswState.medicineCreateHits).toHaveLength(1);

    const body = mswState.medicineCreateHits[0].body;

    expect(body).toMatchObject({
      name: "Paracetamol",
      genericName: "Acetaminophen",
      category: "Analgesic",
      unit: "tablet",
      price: "125.50",
      expiryDate: "2027-12-31",
      reorderLevel: 10,
    });

    // Backend creates the medicine with zero stock.
    expect(body).not.toHaveProperty("stockQuantity");
  });

  it("sends null for an empty optional generic name", async () => {
    await createMedicine({
      name: "Cetirizine",
      genericName: " ",
      category: "Antihistamine",
      unit: "tablet",
      price: "50.00",
      expiryDate: "2027-12-31",
      reorderLevel: "5",
    });

    expect(mswState.medicineCreateHits[0].body.genericName).toBeNull();
  });


  it("searches medicines using the search query", async () => {
    mswState.medicineListResponses.push(medicines);

    const result = await searchMedicines("Para");

    expect(result).toEqual(medicines);
    expect(mswState.medicineListHits).toHaveLength(1);
    expect(mswState.medicineListHits[0].search).toBe("Para");
  });

  it("returns an empty array when no medicines are found", async () => {
    mswState.medicineListResponses.push([]);

    await expect(searchMedicines("unknown")).resolves.toEqual([]);
  });

  it("loads low-stock medicines", async () => {
    mswState.lowStockMedicineResponses.push([medicines[1]]);

    await expect(getLowStockMedicines()).resolves.toEqual([medicines[1]]);
    expect(mswState.lowStockMedicineHits).toHaveLength(1);
  });

  it("loads near-expiry medicines", async () => {
    mswState.nearExpiryMedicineResponses.push([medicines[1]]);

    await expect(getNearExpiryMedicines()).resolves.toEqual([medicines[1]]);
    expect(mswState.nearExpiryMedicineHits).toHaveLength(1);
  });

  it("sends a positive stock delta", async () => {
    const updated = { medicineId: 1, stockQuantity: 60 };
    mswState.stockAdjustmentResponses.push(updated);

    await expect(adjustMedicineStock(1, 10)).resolves.toEqual(updated);

    expect(mswState.stockAdjustmentHits).toHaveLength(1);
    expect(mswState.stockAdjustmentHits[0].id).toBe("1");
    expect(mswState.stockAdjustmentHits[0].body).toEqual({ delta: 10 });
  });

  it("sends a negative stock delta", async () => {
    mswState.stockAdjustmentResponses.push({
      medicineId: 1,
      stockQuantity: 45,
    });

    await adjustMedicineStock(1, -5);

    expect(mswState.stockAdjustmentHits[0].body).toEqual({ delta: -5 });
  });

  it.each([0, 1.5, -2.5])(
    "rejects invalid delta %s before making an API request",
    async (delta) => {
      await expect(adjustMedicineStock(1, delta)).rejects.toThrow(
        "Stock adjustment must be a non-zero whole number.",
      );

      expect(mswState.stockAdjustmentHits).toHaveLength(0);
    },
  );
});
