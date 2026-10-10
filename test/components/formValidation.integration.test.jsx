
import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../src/i18n";
import Input from "../../src/components/Input";
import Button from "../../src/components/Button";


function TestForm({ onSubmit }) {
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (!name.trim() || !email.trim()) {
      return;
    }

    onSubmit({ name, email });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Input
        label="Name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        submitted={submitted}
      />

      <Input
        label="Email"
        name="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        submitted={submitted}
      />

      <Button type="submit">Submit</Button>
    </form>
  );
}

describe("Form validation integration", () => {
  it("shows errors for every invalid field and blocks submission", () => {
    const onSubmit = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <TestForm onSubmit={onSubmit} />
      </I18nextProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.getByRole("textbox", { name: /Name/ })).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(screen.getByRole("textbox", { name: /Email/ })).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits when all required fields are valid", () => {
    const onSubmit = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <TestForm onSubmit={onSubmit} />
      </I18nextProvider>
    );

    fireEvent.change(screen.getByRole("textbox", { name: /Name/ }), {
      target: { value: "Test User" },
    });

    fireEvent.change(screen.getByRole("textbox", { name: /Email/ }), {
      target: { value: "test@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Test User",
      email: "test@example.com",
    });
  });
});

