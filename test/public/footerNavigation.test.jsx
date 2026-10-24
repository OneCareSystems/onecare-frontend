import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PublicLayout from "../../src/layouts/PublicLayout";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("scrolls footer page links to the top, including the current page, and section links to their target", () => {
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const scrollIntoView = vi.fn();
  render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/home" element={<h1>Home page</h1>} />
          <Route path="/appointments" element={<h1>Appointment page</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  const footer = within(screen.getByRole("contentinfo"));
  scrollTo.mockClear();
  fireEvent.click(footer.getByRole("link", { name: "Book an Appointment" }));
  expect(screen.getByRole("heading", { name: "Appointment page" })).toBeVisible();
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "instant" });
  fireEvent.click(footer.getAllByRole("link", { name: "Home", exact: true })[1]);
  scrollTo.mockClear();
  fireEvent.click(footer.getAllByRole("link", { name: "Home", exact: true })[1]);
  expect(scrollTo).toHaveBeenCalledOnce();

  const target = { scrollIntoView };
  const lookup = vi.spyOn(document, "getElementById").mockReturnValue(target);
  fireEvent.click(footer.getByRole("link", { name: "Our Doctors" }));
  expect(lookup).toHaveBeenLastCalledWith("doctors-heading");
  expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
  fireEvent.click(footer.getAllByRole("link", { name: "Contact Us" })[0]);
  expect(lookup).toHaveBeenLastCalledWith("footer-contact");
});
