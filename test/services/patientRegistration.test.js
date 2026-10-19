import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { createPatient } from "../../src/services/patientService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";

afterEach(() => store.dispatch(clearSession()));
describe("ADM-02 service allowlists", () => {
  it("omits clinical and server-owned inputs and strips clinical response properties", async () => {
    store.dispatch(setSession({ accessToken: "synthetic-token", role: "ADMIN" }));
    let sent;
    server.use(http.post("*/patients", async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json({ success: true, data: { patientId: 101, fullName: "Example Patient", duplicateSuspected: true, bloodGroup: "CLINICAL_SECRET", notes: "CLINICAL_SECRET" } }, { status: 201 });
    }));
    const result = await createPatient({ full_name: "Example Patient", dateOfBirth: "1990-01-15", contactNo: "example-phone", address: "Example address", email: "patient@example.invalid", gender: "OTHER", bloodGroup: "CLINICAL_SECRET", patientId: 999, isActive: false });
    expect(sent).toEqual({ full_name: "Example Patient", dateOfBirth: "1990-01-15", contactNo: "example-phone", address: "Example address", email: "patient@example.invalid", gender: "OTHER" });
    expect(result).toEqual({ patientId: 101, fullName: "Example Patient", duplicateSuspected: true });
  });
  it("rejects a malformed creation response rather than claiming success", async () => {
    server.use(http.post("*/patients", () => HttpResponse.json({ success: true, data: {} }, { status: 201 })));
    await expect(createPatient({ full_name: "Example Patient", dateOfBirth: "1990-01-15", contactNo: "example-phone" })).rejects.toThrow(/response format/);
  });
});
