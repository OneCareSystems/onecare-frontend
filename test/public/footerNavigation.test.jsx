import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PublicLayout from "../../src/layouts/PublicLayout";
import i18n from "../../src/i18n";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await i18n.changeLanguage("en");
});

it("navigates footer page links and scrolls to the requested page or section", () => {
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const scrollIntoView = vi.fn();

  render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/home" element={<h1 id="doctors-heading">Home page</h1>} />
          <Route path="/appointments" element={<h1>Appointment page</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  const footer = within(screen.getByRole("contentinfo"));
  const quickLinks = within(
    screen.getByRole("navigation", { name: "Quick Links" }),
  );

  scrollTo.mockClear();
  fireEvent.click(footer.getByRole("link", { name: "Book an Appointment" }));
  expect(screen.getByRole("heading", { name: "Appointment page" })).toBeVisible();
  expect(scrollTo).toHaveBeenLastCalledWith({
    top: 0,
    left: 0,
    behavior: "instant",
  });

  scrollTo.mockClear();
  fireEvent.click(quickLinks.getByRole("link", { name: "Home" }));
  expect(screen.getByRole("heading", { name: "Home page" })).toBeVisible();
  expect(scrollTo).toHaveBeenLastCalledWith({
    top: 0,
    left: 0,
    behavior: "instant",
  });

  expect(document.querySelector("#footer-contact")).toBeInTheDocument();
  const target = { scrollIntoView };
  const lookup = vi.spyOn(document, "getElementById").mockReturnValue(target);
  fireEvent.click(quickLinks.getByRole("link", { name: "Our Doctors" }));
  expect(lookup).toHaveBeenLastCalledWith("doctors-heading");
  expect(scrollIntoView).toHaveBeenCalledWith({
    block: "start",
    behavior: "instant",
  });

  const contactLink = quickLinks.getByRole("link", { name: "Contact Us" });
  expect(contactLink).toHaveAttribute("href", "#footer-contact");
});
