import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import RegisterPatientPage from "../../../src/pages/admin/RegisterPatientPage";
import {
  emptyPatient,
  validatePatient,
} from "../../../src/utils/patientRegistration";
afterEach(cleanup);
it.each(["", "A+", "custom"])(
  "registers with optional blood group %s",
  async (bloodGroup) => {
    let body;
    server.use(
      http.post("*/patients", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            success: true,
            data: { patientId: 101, fullName: "Example Patient" },
          },
          { status: 201 },
        );
      }),
    );
    render(<RegisterPatientPage />);
    const input = screen.getByLabelText("Blood Group (Optional)");
    expect(input).not.toBeRequired();
    expect(input).toHaveAttribute("maxlength", "10");
    fireEvent.change(screen.getByLabelText(/Full Name/), {
      target: { value: "Example Patient" },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/), {
      target: { value: "raw-phone" },
    });
    fireEvent.change(screen.getByLabelText(/Date of Birth/), {
      target: { value: "1990-01-15" },
    });
    fireEvent.change(input, { target: { value: bloodGroup } });
    fireEvent.click(screen.getByRole("button", { name: "Save Patient" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Patient registered successfully",
    );
    expect(body.bloodGroup).toBe(bloodGroup || null);
  },
);
it("rejects blood group over the confirmed limit without an enum restriction", () => {
  const valid = {
    ...emptyPatient,
    full_name: "Example",
    contactNo: "raw",
    dateOfBirth: "1990-01-15",
  };
  expect(
    validatePatient({ ...valid, bloodGroup: "x".repeat(11) }).bloodGroup,
  ).toMatch(/10/);
  expect(validatePatient({ ...valid, bloodGroup: "arbitrary" })).toEqual({});
});
