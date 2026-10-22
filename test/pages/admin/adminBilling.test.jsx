import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { store } from "../../../src/app/store";
import { clearSession, setSession } from "../../../src/features/auth/authSlice";
import BillingPage from "../../../src/pages/admin/BillingPage";
import InvoiceDetail from "../../../src/components/admin/InvoiceDetail";
import { appointment, invoice, pageOf } from "../../fixtures/adminWorkflows";
const ok = (data) => HttpResponse.json({ success: true, data });
let current;
beforeEach(() => {
  current = invoice();
  store.dispatch(setSession({ accessToken: "fixture-token", role: "ADMIN" }));
  server.use(
    http.get("*/invoices", () => ok(pageOf([current]))),
    http.get("*/invoices/401", () => ok(current)),
    http.get("*/patients", () =>
      ok([
        {
          patientId: 101,
          fullName: "Example Patient",
          dateOfBirth: "1990-01-15",
          contactNo: "phone",
        },
      ]),
    ),
  );
});
afterEach(() => {
  cleanup();
  store.dispatch(clearSession());
  vi.restoreAllMocks();
});
const openBilling = () =>
  render(
    <MemoryRouter>
      <BillingPage />
    </MemoryRouter>,
  );
async function openDetail() {
  openBilling();
  fireEvent.click(
    await screen.findByRole("button", { name: "View invoice INV-2090-000401" }),
  );
  await screen.findByRole("heading", { name: "Invoice details" });
  await screen.findByLabelText("Cash amount (LKR)");
}
describe("ADM-07 cash billing", () => {
  it("records partial/full cash using authoritative balances, then locks paid invoice", async () => {
    const amounts = [];
    server.use(
      http.post("*/invoices/401/payments", async ({ request }) => {
        const body = await request.json();
        expect(body.paymentMethod).toBe("CASH");
        expect(Object.keys(body)).toEqual(["amount", "paymentMethod"]);
        amounts.push(body.amount);
        current = invoice(
          amounts.length === 1
            ? {
                amountPaid: "200.00",
                outstandingBalance: "800.00",
                payments: [
                  {
                    paymentId: 701,
                    amount: "200.00",
                    paymentMethod: "CASH",
                    paidAt: "2090-01-15T16:01:00",
                  },
                ],
              }
            : {
                status: "PAID",
                amountPaid: "1000.00",
                outstandingBalance: "0.00",
                payments: [
                  {
                    paymentId: 702,
                    amount: "800.00",
                    paymentMethod: "CASH",
                    paidAt: "2090-01-15T16:02:00",
                  },
                ],
              },
        );
        return ok(current);
      }),
    );
    await openDetail();
    expect(screen.queryByText("CLINICAL_SECRET")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /card/i }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cash amount (LKR)"), {
      target: { value: "200.00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Review cash payment" }),
    );
    expect(amounts).toEqual([]);
    fireEvent.click(
      screen.getByRole("button", { name: "Record cash payment", exact: true }),
    );
    await screen.findByText("Cash payment recorded.");
    expect(amounts).toEqual([200]);
    expect(screen.getByText("Amount due: LKR 800.00")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cash amount (LKR)"), {
      target: { value: "800" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Review cash payment" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Record cash payment", exact: true }),
    );
    await screen.findByText(/Paid invoice: line items and payments are locked/);
    expect(amounts).toEqual([200, 800]);
    expect(
      screen.queryByLabelText("Cash amount (LKR)"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save medicine quantities" }),
    ).not.toBeInTheDocument();
  });
  it.each(["0", "1000.01", "0.001", "-1"])(
    "rejects invalid amount %s before payment",
    async (value) => {
      let posts = 0;
      server.use(
        http.post("*/invoices/401/payments", () => {
          posts++;
          return ok(current);
        }),
      );
      await openDetail();
      fireEvent.change(screen.getByLabelText("Cash amount (LKR)"), {
        target: { value },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Review cash payment" }),
      );
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(posts).toBe(0);
    },
  );
  it.each([400, 403, 409, 500, "network"])(
    "retains input and refetches payment history after %s without automatic retry",
    async (status) => {
      let posts = 0,
        gets = 0;
      server.use(
        http.get("*/invoices/401", () => {
          gets++;
          return ok(current);
        }),
        http.post("*/invoices/401/payments", () => {
          posts++;
          return status === "network"
            ? HttpResponse.error()
            : new HttpResponse(null, { status });
        }),
      );
      await openDetail();
      fireEvent.change(screen.getByLabelText("Cash amount (LKR)"), {
        target: { value: "200.00" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Review cash payment" }),
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: "Record cash payment",
          exact: true,
        }),
      );
      await screen.findByRole("alert");
      await waitFor(() => expect(gets).toBeGreaterThan(1));
      expect(posts).toBe(1);
      expect(screen.getByLabelText("Cash amount (LKR)")).toHaveValue("200.00");
      expect(store.getState().auth.role).toBe("ADMIN");
    },
  );
  it("edits only pending medicine quantities, retains all lines and supports print", async () => {
    let body;
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    server.use(
      http.put("*/invoices/401", async ({ request }) => {
        body = await request.json();
        current = invoice({ total: "700.00", outstandingBalance: "700.00" });
        return ok(current);
      }),
    );
    await openDetail();
    fireEvent.change(screen.getByLabelText("Quantity — Example medicine"), {
      target: { value: "0" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save medicine quantities" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/positive whole/);
    expect(body).toBeUndefined();
    fireEvent.change(screen.getByLabelText("Quantity — Example medicine"), {
      target: { value: "2" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save medicine quantities" }),
    );
    await screen.findByText("Invoice quantities updated.");
    expect(body).toEqual({ items: [{ invoiceItemId: 502, quantity: 2 }] });
    fireEvent.click(screen.getByRole("button", { name: "Print invoice" }));
    expect(print).toHaveBeenCalledTimes(1);
  });
  it("does not request payment for an unpaid zero-balance response", async () => {
    current = invoice({ outstandingBalance: "0.00", amountPaid: "1000.00" });
    render(<InvoiceDetail invoiceId={401} />);
    expect(
      await screen.findByText(/backend still reports Pending/),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Cash amount (LKR)"),
    ).not.toBeInTheDocument();
  });
  it("handles detail errors and consultation-only invoices", async () => {
    server.use(
      http.get("*/invoices/401", () => new HttpResponse(null, { status: 404 })),
    );
    render(<InvoiceDetail invoiceId={401} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no longer available/,
    );
    server.use(
      http.get("*/invoices/401", () =>
        ok(invoice({ items: [current.items[0]] })),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry invoice" }));
    await screen.findByLabelText("Cash amount (LKR)");
    expect(
      screen.queryByRole("button", { name: "Save medicine quantities" }),
    ).not.toBeInTheDocument();
  });
  it("uses supported filters, validates date order and pages invoice history", async () => {
    const requests = [];
    server.use(
      http.get("*/invoices", ({ request }) => {
        const params = Object.fromEntries(new URL(request.url).searchParams);
        requests.push(params);
        return ok(
          pageOf([current], { number: Number(params.page), totalPages: 2 }),
        );
      }),
    );
    openBilling();
    await screen.findByRole("button", { name: "View invoice INV-2090-000401" });
    fireEvent.click(screen.getByRole("button", { name: "Next invoices" }));
    await waitFor(() => expect(requests.at(-1).page).toBe("1"));
    fireEvent.click(screen.getByRole("button", { name: "Previous invoices" }));
    await waitFor(() => expect(requests.at(-1).page).toBe("0"));
    fireEvent.change(screen.getByLabelText("Invoice from date"), {
      target: { value: "2090-02-01" },
    });
    fireEvent.change(screen.getByLabelText("Invoice to date"), {
      target: { value: "2090-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find invoices" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/before/);
    fireEvent.change(screen.getByLabelText("Invoice to date"), {
      target: { value: "2090-03-01" },
    });
    fireEvent.change(screen.getByLabelText("Invoice status"), {
      target: { value: "UNPAID" },
    });
    fireEvent.change(screen.getByLabelText("Invoice number"), {
      target: { value: "INV" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find invoices" }));
    await waitFor(() => expect(requests.at(-1).invoiceNumber).toBe("INV"));
    expect(requests.at(-1).status).toBe("UNPAID");
    fireEvent.click(screen.getByRole("button", { name: "Filter by patient" }));
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Example" },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Select patient 101" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Find invoices" }));
    await waitFor(() => expect(requests.at(-1).patientId).toBe("101"));
    fireEvent.click(
      screen.getByRole("button", { name: "Clear patient filter" }),
    );
    expect(
      screen.queryByText("Selected patient ID: 101"),
    ).not.toBeInTheDocument();
  });
  it("exposes manual generation only for a completed consultation and opens the result", async () => {
    let creates = 0;
    server.use(
      http.get("*/appointments", () =>
        ok([
          appointment(),
          appointment({ appointmentId: 202, status: "COMPLETED" }),
        ]),
      ),
      http.get("*/invoices", () => ok(pageOf([], { totalPages: 0 }))),
      http.post("*/invoices", async ({ request }) => {
        creates++;
        expect(await request.json()).toEqual({ appointmentId: 202 });
        return ok(current);
      }),
    );
    openBilling();
    fireEvent.click(
      screen.getByRole("button", { name: "Find missing consultation invoice" }),
    );
    await screen.findByRole("option", { name: /202 · Example/ });
    fireEvent.click(
      screen.getByRole("button", { name: "Find or generate invoice" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Select a completed/);
    fireEvent.change(screen.getByLabelText("Completed consultation"), {
      target: { value: "202" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Find or generate invoice" }),
    );
    await screen.findByLabelText("Cash amount (LKR)");
    expect(creates).toBe(1);
  });
});
