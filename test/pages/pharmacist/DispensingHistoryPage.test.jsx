import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { store } from "../../../src/app/store";
import { clearSession, setSession } from "../../../src/features/auth/authSlice";
import DispensingHistoryPage from "../../../src/pages/pharmacist/DispensingHistoryPage";
import { invoice, pageOf } from "../../fixtures/adminWorkflows";

const ok = (data, status = 200) =>
  HttpResponse.json({ success: true, data }, { status });
const prescription = {
  prescriptionId: 501,
  patientId: 25,
  appointmentId: 201,
  status: "DISPENSED",
  createdAt: "2099-01-01T00:00:00",
  clinicalNotes: "PRIVATE CLINICAL NOTES",
  diagnosis: "PRIVATE DIAGNOSIS",
  items: [
    {
      itemId: 1,
      itemType: "IN_HOUSE",
      medicineId: 11,
      medicineName: "Paracetamol",
      quantityDispensed: 6,
    },
  ],
};
const handover = {
  dispenseId: 10,
  inHouse: true,
  prescriptionId: 501,
  patientId: 25,
  status: "DISPENSED",
  dispensedAt: "2026-11-03T10:00:00",
  items: [{ medicineId: 11, prescriptionItemId: 1, quantityDispensed: 6 }],
};
const walkIn = {
  dispenseId: 11,
  prescriptionId: null,
  patientId: null,
  status: "DISPENSED",
  dispensedAt: "2026-11-03T11:00:00",
  items: [{ medicineId: 12, quantityDispensed: 3 }],
};
let gets, invoices, posts;
beforeEach(() => {
  gets = 0;
  invoices = [];
  posts = [];
  store.dispatch(
    setSession({ accessToken: "fixture-token", role: "PHARMACIST" }),
  );
  server.use(
    http.get("*/prescriptions", ({ request }) => {
      gets++;
      return ok(
        new URL(request.url).searchParams.get("status") === "DISPENSED"
          ? [prescription]
          : [
              {
                ...prescription,
                prescriptionId: 502,
                status: "PARTIALLY_DISPENSED",
                items: [{ ...prescription.items[0], quantityDispensed: 2 }],
              },
            ],
      );
    }),
    http.get("*/external-dispensing", () =>
      ok([
        handover,
        walkIn,
        { ...walkIn, dispenseId: 12, status: "PENDING" },
        { ...walkIn, dispenseId: 13, status: "CANCELLED" },
      ]),
    ),
    http.get("*/invoices", () => ok(pageOf(invoices))),
    http.get("*/invoices/401", () =>
      ok(invoice({ dispenseId: posts[0]?.dispenseId ?? 10 })),
    ),
    http.post("*/invoices", async ({ request }) => {
      posts.push(await request.json());
      const created = invoice({ dispenseId: posts[0].dispenseId });
      invoices = [created];
      return ok(created, 201);
    }),
  );
});
afterEach(() => {
  cleanup();
  store.dispatch(clearSession());
});

describe("combined dispensing history", () => {
  it("merges both GET sources, distinguishes types, sorts by completion and omits clinical data", async () => {
    render(<DispensingHistoryPage />);
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3); // A prescription represented by a handover is not duplicated.
    expect(rows[0]).toHaveTextContent("External");
    expect(rows[0]).toHaveTextContent("Walk-in");
    expect(rows[0]).toHaveTextContent("Not linked");
    expect(rows[1]).toHaveTextContent("In-house");
    expect(rows[1]).toHaveTextContent("Paracetamol");
    expect(rows[2]).toHaveTextContent("Not recorded");
    expect(screen.queryByText(/PRIVATE|2099/)).not.toBeInTheDocument();
    expect(gets).toBe(2);
    expect(posts).toEqual([]);
  });
  it("filters type, patient, prescription, date and status and refreshes the same sources", async () => {
    render(<DispensingHistoryPage />);
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText("Dispensing type"), {
      target: { value: "External" },
    });
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      2,
    );
    fireEvent.change(screen.getByLabelText("Dispensing type"), {
      target: { value: "In-house" },
    });
    fireEvent.change(screen.getByLabelText("Patient ID"), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText("Prescription ID"), {
      target: { value: "501" },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "DISPENSED" },
    });
    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2026-11-03" },
    });
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2026-11-03" },
    });
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      2,
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh history" }));
    await waitFor(() => expect(gets).toBe(4));
    expect(screen.getByLabelText("Prescription ID")).toHaveValue("501");
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2026-11-01" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/before/);
  });
  it.each(["In-house", "External"])(
    "finds/generates and views the %s invoice using only the billing API",
    async (type) => {
      render(<DispensingHistoryPage />);
      const table = await screen.findByRole("table");
      const row = within(table)
        .getAllByRole("row")
        .find(
          (candidate) =>
            candidate.textContent.includes(type) &&
            !candidate.textContent.includes("Not recorded"),
        );
      fireEvent.click(
        within(row).getByRole("button", { name: "View / Generate Invoice" }),
      );
      const dialog = await screen.findByRole("dialog", {
        name: "Medicine invoice",
      });
      expect(
        await within(dialog).findByText("INV-2090-000401"),
      ).toBeInTheDocument();
      expect(posts).toEqual([{ dispenseId: type === "In-house" ? 10 : 11 }]);
      expect(
        within(dialog).queryByRole("button", { name: "Review cash payment" }),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByRole("button", {
          name: "Save medicine quantities",
        }),
      ).not.toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.click(
        within(row).getByRole("button", { name: "View Invoice" }),
      );
      await screen.findByRole("dialog");
      expect(posts).toHaveLength(1);
    },
  );
  it("keeps billing retry separate from dispensing after invoice creation fails", async () => {
    let attempts = 0;
    server.use(
      http.post("*/invoices", async ({ request }) => {
        attempts++;
        const body = await request.json();
        if (attempts === 1)
          return HttpResponse.json(
            { success: false, message: "Billing temporarily unavailable" },
            { status: 503 },
          );
        invoices = [invoice({ dispenseId: body.dispenseId })];
        return ok(invoices[0], 201);
      }),
    );
    render(<DispensingHistoryPage />);
    const table = await screen.findByRole("table");
    const row = within(table)
      .getAllByRole("row")
      .find((candidate) => candidate.textContent.includes("External"));
    const button = within(row).getByRole("button", {
      name: "View / Generate Invoice",
    });
    fireEvent.click(button);
    expect(await within(row).findByRole("alert")).toHaveTextContent(
      /do not repeat dispensing/,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(button);
    await screen.findByRole("dialog");
    expect(attempts).toBe(2);
    expect(gets).toBe(2);
  });
  it("shows a history error rather than a misleading partial list if a source fails", async () => {
    server.use(
      http.get(
        "*/external-dispensing",
        () => new HttpResponse(null, { status: 403 }),
      ),
    );
    render(<DispensingHistoryPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/permissions/);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
