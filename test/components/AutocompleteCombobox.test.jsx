import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AutocompleteCombobox from "../../src/components/AutocompleteCombobox";

afterEach(cleanup);
const options = [
  { value: 101, label: "Example One", detail: "Clinic ID: 101" },
  { value: 102, label: "Example Two" },
];
function Selection({ selected, ...props }) {
  const [value, setValue] = useState(selected),
    [query, setQuery] = useState("");
  return (
    <>
      <AutocompleteCombobox
        label="Patient"
        value={value}
        options={options.filter((row) =>
          row.label.toLowerCase().includes(query.toLowerCase()),
        )}
        query={query}
        onQueryChange={setQuery}
        onSelect={setValue}
        onClear={() => setValue(null)}
        {...props}
      />
      <button>Outside</button>
    </>
  );
}
describe("shared single-input autocomplete", () => {
  it("types directly into one field, filters immediately and displays the selection in the same input", async () => {
    const user = userEvent.setup();
    render(<Selection />);
    const field = screen.getByRole("combobox", { name: "Patient" });
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    await user.click(field);
    expect(screen.getAllByRole("option")).toHaveLength(2);
    await user.type(field, "Two");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(field).toHaveValue("Two");
    await user.click(screen.getByRole("option", { name: "Example Two" }));
    expect(screen.getByRole("combobox", { name: "Patient" })).toBe(field);
    expect(field).toHaveValue("Example Two");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Toggle patient options" }),
    );
    expect(screen.getAllByRole("option")).toHaveLength(2);
    await user.click(
      screen.getByRole("button", { name: "Toggle patient options" }),
    );
    expect(field).toHaveValue("Example Two");
  });
  it("supports arrows, home/end, Enter, Escape and explicit clearing without discarding a previous selection while typing", async () => {
    const user = userEvent.setup();
    render(<Selection required />);
    const field = screen.getByRole("combobox", { name: "Patient" });
    await user.click(field);
    await user.keyboard("{ArrowDown}{Home}{End}{ArrowUp}{ArrowDown}{Enter}");
    expect(field).toHaveValue("Example Two");
    expect(field).toHaveFocus();
    await user.click(field);
    await user.type(field, "Unrelated search");
    await user.keyboard("{Escape}");
    expect(field).toHaveValue("Example Two");
    expect(field).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Clear patient" }));
    expect(field).toHaveValue("");
    await user.click(field);
    await user.keyboard("{Escape}{ArrowUp}{Escape}{Enter}");
    expect(field).toHaveAttribute("aria-expanded", "true");
  });
  it("closes on outside pointer/focus without changing selection", async () => {
    const changed = vi.fn(),
      user = userEvent.setup();
    render(<Selection onOpenChange={changed} />);
    const field = screen.getByRole("combobox", { name: "Patient" });
    await user.click(field);
    await user.click(screen.getByRole("option", { name: /Example One/ }));
    expect(field).toHaveValue("Example One");
    await user.click(field);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(field);
    await user.tab();
    await user.tab();
    expect(changed).toHaveBeenCalledWith(false);
  });
  it("announces loading/error/empty and prevents failed or empty Enter selection", async () => {
    const user = userEvent.setup(),
      retry = vi.fn();
    const { rerender } = render(<Selection loading options={[]} />);
    await user.click(screen.getByRole("combobox", { name: "Patient" }));
    expect(screen.getByRole("status")).toHaveTextContent("Loading patient");
    await user.keyboard("{ArrowUp}{Enter}");
    rerender(<Selection error="Unable to load patients" onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(<Selection options={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No matches found");
    expect(screen.getByRole("combobox", { name: "Patient" })).toHaveValue("");
  });
});
