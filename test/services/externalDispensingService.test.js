
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiPost, apiGet } = vi.hoisted(() => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
}));

vi.mock("../../src/services/apiClient", () => ({
  default: {
    post: apiPost,
    get: apiGet,
  },
}));

import {
  createExternalDispensing,
  getExternalDispensingById,
  verifyExternalDispensingIdentity,
  completeExternalDispensing,
} from "../../src/services/externalDispensingService";

const apiResponse = (data) => ({
  data: {
    success: true,
    message: "Success",
    data,
  },
});

const dispensingRecord = {
  dispenseId: 10,
  prescriptionId: 20,
  patientId: 30,
  verificationMethod: "PHONE",
  verificationStatus: "VERIFIED",
  status: "PENDING",
  deliveryMethod: "PICK_UP",
  items: [],
};

describe("externalDispensingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("createExternalDispensing", () => {
    it("creates a dispensing record with the expected payload", async () => {
      apiPost.mockResolvedValue(apiResponse(dispensingRecord));

      const result = await createExternalDispensing({
        prescriptionId: 20,
        patientId: 30,
        verificationMethod: "PHONE",
        deliveryMethod: "PICK_UP",
        items: [
          {
            medicineId: 5,
            prescriptionItemId: 6,
            quantity: "2",
            medicineName: "Paracetamol",
          },
        ],
      });

      expect(result).toEqual(dispensingRecord);
      expect(apiPost).toHaveBeenCalledWith(
        "/external-dispensing",
        {
          prescriptionId: 20,
          patientId: 30,
          verificationMethod: "PHONE",
          deliveryMethod: "PICK_UP",
          items: [
            {
              medicineId: 5,
              prescriptionItemId: 6,
              quantity: 2,
              medicineName: "Paracetamol",
            },
          ],
        },
        { signal: undefined },
      );
    });

    it("uses default verification and delivery methods", async () => {
      apiPost.mockResolvedValue(apiResponse(dispensingRecord));

      await createExternalDispensing({
        prescriptionId: 20,
        patientId: 30,
        items: [{ medicineId: 5, quantity: 1 }],
      });

      expect(apiPost.mock.calls[0][1]).toMatchObject({
        verificationMethod: "PHONE",
        deliveryMethod: "PICK_UP",
      });
    });

    it("rejects when prescription ID is missing", async () => {
      await expect(
        createExternalDispensing({
          patientId: 30,
          items: [{ medicineId: 5, quantity: 1 }],
        }),
      ).rejects.toThrow("Prescription ID and patient ID are required.");

      expect(apiPost).not.toHaveBeenCalled();
    });

    it("rejects when patient ID is missing", async () => {
      await expect(
        createExternalDispensing({
          prescriptionId: 20,
          items: [{ medicineId: 5, quantity: 1 }],
        }),
      ).rejects.toThrow("Prescription ID and patient ID are required.");

      expect(apiPost).not.toHaveBeenCalled();
    });

    it("rejects an empty medicine list", async () => {
      await expect(
        createExternalDispensing({
          prescriptionId: 20,
          patientId: 30,
          items: [],
        }),
      ).rejects.toThrow("At least one medicine item is required.");

      expect(apiPost).not.toHaveBeenCalled();
    });

    it("rejects an unsuccessful API response envelope", async () => {
      apiPost.mockResolvedValue({
        data: {
          success: false,
          message: "Prescription not found",
          data: null,
        },
      });

      await expect(
        createExternalDispensing({
          prescriptionId: 20,
          patientId: 30,
          items: [{ medicineId: 5, quantity: 1 }],
        }),
      ).rejects.toThrow("Prescription not found");
    });

    it("propagates API errors", async () => {
      apiPost.mockRejectedValue(new Error("Network error"));

      await expect(
        createExternalDispensing({
          prescriptionId: 20,
          patientId: 30,
          items: [{ medicineId: 5, quantity: 1 }],
        }),
      ).rejects.toThrow("Network error");
    });
  });

  describe("getExternalDispensingById", () => {
    it("fetches a dispensing record by ID", async () => {
      apiGet.mockResolvedValue(apiResponse(dispensingRecord));

      const result = await getExternalDispensingById(10);

      expect(result).toEqual(dispensingRecord);
      expect(apiGet).toHaveBeenCalledWith(
        "/external-dispensing/10",
        { signal: undefined },
      );
    });

    it("rejects when the dispensing ID is missing", async () => {
      await expect(getExternalDispensingById(null)).rejects.toThrow(
        "Dispensing record ID is required.",
      );

      expect(apiGet).not.toHaveBeenCalled();
    });
  });

  describe("verifyExternalDispensingIdentity", () => {
    it("submits identity verification details", async () => {
      apiPost.mockResolvedValue(
        apiResponse({
          ...dispensingRecord,
          verificationStatus: "VERIFIED",
        }),
      );

      const result = await verifyExternalDispensingIdentity(10, {
        verificationMethod: "PHONE",
        verified: true,
        notes: "Identity checked by staff",
      });

      expect(result.verificationStatus).toBe("VERIFIED");
      expect(apiPost).toHaveBeenCalledWith(
        "/external-dispensing/10/verify-identity",
        {
          verificationMethod: "PHONE",
          verified: true,
          notes: "Identity checked by staff",
        },
        { signal: undefined },
      );
    });

    it("rejects an unsupported verification method", async () => {
      await expect(
        verifyExternalDispensingIdentity(10, {
          verificationMethod: "EMAIL",
        }),
      ).rejects.toThrow("Choose Phone or Clinic ID verification.");

      expect(apiPost).not.toHaveBeenCalled();
    });

    it("rejects when the dispensing ID is missing", async () => {
      await expect(
        verifyExternalDispensingIdentity(null, {
          verificationMethod: "PHONE",
        }),
      ).rejects.toThrow("Dispensing record ID is required.");

      expect(apiPost).not.toHaveBeenCalled();
    });

    it("uses null when verification notes are omitted", async () => {
      apiPost.mockResolvedValue(apiResponse(dispensingRecord));

      await verifyExternalDispensingIdentity(10, {
        verificationMethod: "CLINIC_ID",
      });

      expect(apiPost.mock.calls[0][1]).toMatchObject({
        verificationMethod: "CLINIC_ID",
        verified: true,
        notes: null,
      });
    });
  });

  describe("completeExternalDispensing", () => {
    it("completes dispensing using the record ID", async () => {
      const completedRecord = {
        ...dispensingRecord,
        status: "DISPENSED",
      };

      apiPost.mockResolvedValue(apiResponse(completedRecord));

      const result = await completeExternalDispensing(10);

      expect(result.status).toBe("DISPENSED");
      expect(apiPost).toHaveBeenCalledWith(
        "/external-dispensing/10/complete",
        undefined,
        { signal: undefined },
      );
    });

    it("rejects when the dispensing ID is missing", async () => {
      await expect(completeExternalDispensing(null)).rejects.toThrow(
        "Dispensing record ID is required.",
      );

      expect(apiPost).not.toHaveBeenCalled();
    });

    it("propagates backend completion errors", async () => {
      apiPost.mockRejectedValue(new Error("Insufficient stock"));

      await expect(completeExternalDispensing(10)).rejects.toThrow(
        "Insufficient stock",
      );
    });
  });
});
