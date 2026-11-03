import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { findOrGenerateDispensingInvoice } from "../../src/services/adminWorkflowService";
import { invoice, pageOf } from "../fixtures/adminWorkflows";

const ok = (data, status = 200) =>
  HttpResponse.json({ success: true, data }, { status });
beforeEach(() =>
  store.dispatch(
    setSession({ accessToken: "fixture-token", role: "PHARMACIST" }),
  ),
);
afterEach(() => store.dispatch(clearSession()));

describe("existing dispensing invoice flow", () => {
  it("retrieves the consultation invoice when the backend confirms it already bills the medicines", async () => {
    let posts = 0;
    server.use(
      http.get("*/invoices", () =>
        ok(pageOf([invoice({ appointmentId: 201, dispenseId: null })])),
      ),
      http.get("*/prescriptions/501", () =>
        ok({ prescriptionId: 501, patientId: 101, appointmentId: 201 }),
      ),
      http.get("*/invoices/401", () =>
        ok(invoice({ appointmentId: 201, dispenseId: null })),
      ),
      http.post("*/invoices", () => {
        posts++;
        return HttpResponse.json(
          {
            success: false,
            message:
              "Dispense event belongs to appointment whose invoice already includes medicine lines",
          },
          { status: 409 },
        );
      }),
    );
    expect(
      (
        await findOrGenerateDispensingInvoice({
          dispenseId: 10,
          prescriptionId: 501,
          patientId: 101,
        })
      ).invoiceId,
    ).toBe(401);
    expect(posts).toBe(1);
  });
  it("scans all invoice pages and retrieves the existing invoice without a create", async () => {
    const pages = [];
    let posts = 0;
    server.use(
      http.get("*/invoices", ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(params.get("patientId")).toBe("25");
        const page = Number(params.get("page"));
        pages.push(page);
        return ok(
          pageOf(
            page === 0
              ? [invoice({ dispenseId: 99 })]
              : [invoice({ dispenseId: 10 })],
            { number: page, totalPages: 2, last: page === 1 },
          ),
        );
      }),
      http.get("*/invoices/401", () => ok(invoice({ dispenseId: 10 }))),
      http.post("*/invoices", () => {
        posts++;
        return ok(invoice(), 201);
      }),
    );
    expect(
      (await findOrGenerateDispensingInvoice({ dispenseId: 10, patientId: 25 }))
        .dispenseId,
    ).toBe(10);
    expect(pages).toEqual([0, 1]);
    expect(posts).toBe(0);
  });
  it("creates only after finding no invoice, including a walk-in with no patient filter", async () => {
    let body;
    server.use(
      http.get("*/invoices", ({ request }) => {
        expect(new URL(request.url).searchParams.has("patientId")).toBe(false);
        return ok(pageOf([]));
      }),
      http.post("*/invoices", async ({ request }) => {
        body = await request.json();
        return ok(invoice({ patientId: null, dispenseId: 10 }), 201);
      }),
    );
    const result = await findOrGenerateDispensingInvoice({
      dispenseId: 10,
      patientId: null,
    });
    expect(body).toEqual({ dispenseId: 10 });
    expect(result.patientId).toBeNull();
  });
  it("recovers the existing invoice on a racing duplicate conflict without posting twice", async () => {
    let created = false,
      posts = 0;
    server.use(
      http.get("*/invoices", () =>
        ok(pageOf(created ? [invoice({ dispenseId: 10 })] : [])),
      ),
      http.post("*/invoices", () => {
        posts++;
        created = true;
        return HttpResponse.json(
          { success: false, message: "An invoice already exists" },
          { status: 409 },
        );
      }),
      http.get("*/invoices/401", () => ok(invoice({ dispenseId: 10 }))),
    );
    expect(
      (await findOrGenerateDispensingInvoice({ dispenseId: 10 })).invoiceId,
    ).toBe(401);
    expect(posts).toBe(1);
  });
  it("uses existing appointment billing for historical in-house prescriptions", async () => {
    let posts = 0;
    server.use(
      http.get("*/invoices", () =>
        ok(pageOf([invoice({ appointmentId: 201 })])),
      ),
      http.get("*/invoices/401", () => ok(invoice({ appointmentId: 201 }))),
      http.post("*/invoices", () => {
        posts++;
        return ok(invoice(), 201);
      }),
    );
    expect(
      (
        await findOrGenerateDispensingInvoice({
          appointmentId: 201,
          patientId: 101,
        })
      ).invoiceId,
    ).toBe(401);
    expect(posts).toBe(0);
  });
  it("preserves permission failures without attempting invoice creation", async () => {
    let posts = 0;
    server.use(
      http.get("*/invoices", () => new HttpResponse(null, { status: 403 })),
      http.post("*/invoices", () => {
        posts++;
        return ok(invoice(), 201);
      }),
    );
    await expect(
      findOrGenerateDispensingInvoice({ dispenseId: 10 }),
    ).rejects.toMatchObject({ status: 403 });
    expect(posts).toBe(0);
  });
});
