import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import KnowledgeBaseManager from "../../src/components/chatbot/KnowledgeBaseManager";
import * as api from "../../src/services/knowledgeBaseService";

vi.mock("../../src/services/knowledgeBaseService", () => ({
  listKnowledgeResources: vi.fn(),
  getKnowledgeResource: vi.fn(),
  addKnowledgeLink: vi.fn(),
  uploadKnowledgePdf: vi.fn(),
  removeKnowledgeResource: vi.fn(),
}));

const pdf = {
  id: 1,
  title: "Clinic guide",
  originalFilename: "guide.pdf",
  sourceType: "PDF",
  status: "PENDING",
  createdAt: "2026-10-22T10:00:00Z",
  uploadedBy: "42",
};
const web = {
  id: 2,
  title: "Health education",
  sourceType: "WEB",
  status: "INDEXED",
  sourceUrl: "https://who.int/page",
};

beforeEach(() => {
  vi.resetAllMocks();
  api.listKnowledgeResources.mockResolvedValue({
    items: [pdf, web],
    count: 2,
    totalPages: 2,
  });
  api.getKnowledgeResource.mockResolvedValue(pdf);
  api.uploadKnowledgePdf.mockResolvedValue(pdf);
  api.addKnowledgeLink.mockResolvedValue(web);
  api.removeKnowledgeResource.mockResolvedValue(undefined);
});
afterEach(cleanup);

it("lists persisted resources, filters and pages through the API", async () => {
  const user = userEvent.setup();
  render(<KnowledgeBaseManager />);
  expect(await screen.findByText("Clinic guide")).toBeInTheDocument();
  expect(screen.getByText("Health education")).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Resource type"), "WEB");
  await waitFor(() =>
    expect(api.listKnowledgeResources).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, sourceType: "WEB" }),
      expect.anything(),
    ),
  );
  await screen.findByText("Clinic guide");
  await user.click(screen.getByRole("button", { name: /next/i }));
  await waitFor(() =>
    expect(api.listKnowledgeResources).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, sourceType: "WEB" }),
      expect.anything(),
    ),
  );
});

it("uploads the selected PDF and submits a website URL", async () => {
  const user = userEvent.setup();
  render(<KnowledgeBaseManager />);
  await screen.findByText("Clinic guide");
  const file = new File(["%PDF-1.4"], "guide.pdf", { type: "application/pdf" });
  await user.upload(screen.getByLabelText("PDF file"), file);
  await user.type(
    screen.getByLabelText("PDF title (optional)"),
    "Clinic guide",
  );
  await user.click(screen.getByRole("button", { name: "Upload PDF" }));
  await waitFor(() =>
    expect(api.uploadKnowledgePdf).toHaveBeenCalledWith(file, "Clinic guide"),
  );
  expect(
    await screen.findByText("PDF queued for ingestion."),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "Add Link" }));
  await user.type(
    screen.getByLabelText(/^Approved website URL/),
    "https://who.int/page",
  );
  await user.click(screen.getByRole("button", { name: "Add link" }));
  await waitFor(() =>
    expect(api.addKnowledgeLink).toHaveBeenCalledWith("https://who.int/page"),
  );
  expect(
    await screen.findByText("Link queued for ingestion."),
  ).toBeInTheDocument();
});

it("loads resource details and requires confirmation before removing", async () => {
  const user = userEvent.setup();
  render(<KnowledgeBaseManager />);
  const cell = await screen.findByText("Clinic guide");
  await user.click(
    within(cell.closest("tr")).getByRole("button", { name: "Details" }),
  );
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("guide.pdf")).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: /close/i }));
  await user.click(
    within(cell.closest("tr")).getByRole("button", { name: "Remove" }),
  );
  expect(api.removeKnowledgeResource).not.toHaveBeenCalled();
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Remove resource",
    }),
  );
  await waitFor(() =>
    expect(api.removeKnowledgeResource).toHaveBeenCalledWith(1),
  );
  expect(
    await screen.findByText("Resource removed from chatbot retrieval."),
  ).toBeInTheDocument();
});

it("shows actionable service and authorization errors", async () => {
  api.listKnowledgeResources.mockRejectedValue({
    userMessage: "Insufficient permissions.",
  });
  render(<KnowledgeBaseManager />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Insufficient permissions.",
  );
  expect(
    screen.queryByRole("region", { name: "Chatbot knowledge resources" }),
  ).not.toBeInTheDocument();
});

it("gates submit on a file or URL and Clear resets the form", async () => {
  const user = userEvent.setup();
  render(<KnowledgeBaseManager />);
  await screen.findByText("Clinic guide");

  // PDF mode: the submit stays disabled until a file is picked.
  const submit = screen.getByRole("button", { name: "Upload PDF" });
  expect(submit).toBeDisabled();
  const file = new File(["%PDF-1.4"], "guide.pdf", { type: "application/pdf" });
  await user.upload(screen.getByLabelText("PDF file"), file);
  await user.type(screen.getByLabelText("PDF title (optional)"), "Clinic guide");
  expect(submit).toBeEnabled();

  // Clear empties the picked file and the title.
  await user.click(screen.getByRole("button", { name: "Clear" }));
  expect(screen.getByLabelText("PDF title (optional)")).toHaveValue("");
  expect(submit).toBeDisabled();

  // LINK mode is gated the same way on the URL.
  await user.click(screen.getByRole("tab", { name: "Add Link" }));
  const addLink = screen.getByRole("button", { name: "Add link" });
  expect(addLink).toBeDisabled();
  await user.type(
    screen.getByLabelText(/^Approved website URL/),
    "https://who.int/page",
  );
  expect(addLink).toBeEnabled();
});

it("resets the opposite source's fields when switching modes", async () => {
  const user = userEvent.setup();
  render(<KnowledgeBaseManager />);
  await screen.findByText("Clinic guide");

  const file = new File(["%PDF-1.4"], "guide.pdf", { type: "application/pdf" });
  await user.upload(screen.getByLabelText("PDF file"), file);
  await user.click(screen.getByRole("tab", { name: "Add Link" }));
  await user.type(
    screen.getByLabelText(/^Approved website URL/),
    "https://who.int/page",
  );
  // Switching back to PDF must not keep the URL around for a stale submit.
  await user.click(screen.getByRole("tab", { name: "Upload PDF" }));
  expect(screen.getByLabelText("PDF title (optional)")).toHaveValue("");
  await user.click(screen.getByRole("tab", { name: "Add Link" }));
  expect(screen.getByLabelText(/^Approved website URL/)).toHaveValue("");
});

it("hides pagination while the result fits a single page", async () => {
  api.listKnowledgeResources.mockResolvedValue({
    items: [pdf],
    count: 1,
    totalPages: 1,
  });
  render(<KnowledgeBaseManager />);
  await screen.findByText("Clinic guide");
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});

it("reports uploads through onUploaded without the standalone dialogs", async () => {
  const user = userEvent.setup();
  const onUploaded = vi.fn();
  render(<KnowledgeBaseManager embedded onUploaded={onUploaded} />);
  await screen.findByText("Clinic guide");

  const file = new File(["%PDF-1.4"], "guide.pdf", { type: "application/pdf" });
  await user.upload(screen.getByLabelText("PDF file"), file);
  await user.click(screen.getByRole("button", { name: "Upload PDF" }));
  await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(pdf));

  // embedded: the Details modal and Remove confirmation are not rendered, so
  // the table's Remove button cannot fire a deletion on its own.
  await user.click(
    within(screen.getByText("Clinic guide").closest("tr")).getByRole("button", {
      name: "Remove",
    }),
  );
  expect(api.removeKnowledgeResource).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
