import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import KnowledgeBasePage from "../../../src/pages/doctor/KnowledgeBasePage";
import { mswState, resetMswState } from "../../msw/handlers";

const kbDoc = (overrides = {}) => ({
  id: 11,
  title: "Hypertension Guidelines",
  fileName: "hypertension.pdf",
  category: "Cardiology",
  description: "Management of elevated blood pressure in adults.",
  uploadedAt: "2026-10-14T09:00:00",
  sizeBytes: 5120,
  sourceType: "PDF",
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/doctor/knowledge-base"]}>
      <KnowledgeBasePage />
    </MemoryRouter>,
  );

/** Same formatter the page uses, so the assertion is locale-agnostic. */
const formattedDate = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

afterEach(() => {
  resetMswState();
  vi.restoreAllMocks();
});

describe("KnowledgeBasePage", () => {
  it("lists documents with metadata, a count label and an open link", async () => {
    mswState.kbListResponses = [
      {
        items: [
          kbDoc(),
          kbDoc({
            id: 12,
            title: "Diabetes Protocol",
            fileName: "diabetes.pdf",
            category: null,
            description: null,
            uploadedAt: "2026-10-01T08:30:00",
            sizeBytes: 20480,
          }),
        ],
        count: 2,
        totalPages: 1,
      },
    ];
    renderPage();

    expect(await screen.findByText("Hypertension Guidelines")).toBeInTheDocument();
    expect(screen.getByText("Diabetes Protocol")).toBeInTheDocument();
    expect(screen.getByText("hypertension.pdf")).toBeInTheDocument();
    expect(screen.getByText("diabetes.pdf")).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(screen.getByText("5.0 KB")).toBeInTheDocument();
    expect(screen.getByText("20 KB")).toBeInTheDocument();
    expect(
      screen.getByText(formattedDate("2026-10-14T09:00:00")),
    ).toBeInTheDocument();
    expect(screen.getByText("2 references")).toBeInTheDocument();

    // Both cards fall back to the backend's file endpoint.
    const openLinks = screen.getAllByRole("link", { name: /^Open$/i });
    expect(openLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/api/knowledge-base/documents/11/file",
      "/api/knowledge-base/documents/12/file",
    ]);
    expect(mswState.kbListHits).toHaveLength(1);
  });

  it("opens the fallback file URL in a new tab from the card itself", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    mswState.kbListResponses = [{ items: [kbDoc()], count: 1, totalPages: 1 }];
    renderPage();

    await user.click(
      await screen.findByRole("button", {
        name: "Open Hypertension Guidelines in a new tab",
      }),
    );

    expect(openSpy).toHaveBeenCalledWith(
      "/api/knowledge-base/documents/11/file",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("removes a document only after the confirm step", async () => {
    const user = userEvent.setup();
    mswState.kbListResponses = [{ items: [kbDoc()], count: 1, totalPages: 1 }];
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Remove Hypertension Guidelines" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Remove reference" });
    expect(
      within(dialog).getByText(/the chatbot will no longer reference/i),
    ).toBeInTheDocument();
    // Nothing is deleted before the confirmation.
    expect(mswState.kbDeleteHits).toHaveLength(0);

    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(mswState.kbDeleteHits).toHaveLength(1));
    expect(mswState.kbDeleteHits[0].id).toBe("11");
    expect(
      await screen.findByText("No references yet"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("treats a 404 during removal as already gone", async () => {
    const user = userEvent.setup();
    mswState.kbListResponses = [{ items: [kbDoc()], count: 1, totalPages: 1 }];
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Remove Hypertension Guidelines" }),
    );
    mswState.kbDeleteErrorMode = "not-found";
    await user.click(
      within(screen.getByRole("dialog", { name: "Remove reference" })).getByRole(
        "button",
        { name: "Remove" },
      ),
    );

    expect(await screen.findByText("No references yet")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains a permission failure and keeps the document", async () => {
    const user = userEvent.setup();
    mswState.kbListResponses = [{ items: [kbDoc()], count: 1, totalPages: 1 }];
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Remove Hypertension Guidelines" }),
    );
    mswState.kbDeleteErrorMode = "forbidden";
    await user.click(
      within(screen.getByRole("dialog", { name: "Remove reference" })).getByRole(
        "button",
        { name: "Remove" },
      ),
    );

    expect(
      await screen.findByText(
        "You don't have permission to remove this document.",
      ),
    ).toBeInTheDocument();
    // The document stays in the grid and the dialog stays open for a retry.
    expect(screen.getAllByText("Hypertension Guidelines").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByRole("dialog", { name: "Remove reference" })).toBeInTheDocument();
  });

  it("falls back to a generic removal error for other failures", async () => {
    const user = userEvent.setup();
    mswState.kbListResponses = [{ items: [kbDoc()], count: 1, totalPages: 1 }];
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Remove Hypertension Guidelines" }),
    );
    mswState.kbDeleteErrorMode = "server-error";
    await user.click(
      within(screen.getByRole("dialog", { name: "Remove reference" })).getByRole(
        "button",
        { name: "Remove" },
      ),
    );

    expect(
      await screen.findByText(
        "Unable to remove the document. Please try again.",
      ),
    ).toBeInTheDocument();
  });

  it("filters references by search and can clear the query", async () => {
    const user = userEvent.setup();
    mswState.kbListResponses = [
      {
        items: [
          kbDoc(),
          kbDoc({
            id: 12,
            title: "Diabetes Protocol",
            fileName: "diabetes.pdf",
            category: "Endocrinology",
          }),
        ],
        count: 2,
        totalPages: 1,
      },
    ];
    renderPage();
    expect(await screen.findByText("Hypertension Guidelines")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "diabetes");
    await waitFor(() =>
      expect(screen.getByText("1 of 2 references")).toBeInTheDocument(),
    );
    expect(screen.getByText("Diabetes Protocol")).toBeInTheDocument();
    expect(screen.queryByText("Hypertension Guidelines")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "oncology");
    await waitFor(() =>
      expect(screen.getByText("No matching references found")).toBeInTheDocument(),
    );
    expect(screen.getByText("0 of 2 references")).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("searchbox").parentElement).getByRole(
        "button",
        { name: "Clear search" },
      ),
    );
    await waitFor(() =>
      expect(screen.getByText("2 references")).toBeInTheDocument(),
    );
    expect(screen.getByText("Hypertension Guidelines")).toBeInTheDocument();
    expect(screen.getByText("Diabetes Protocol")).toBeInTheDocument();
  });

  it("shows the first-use empty state when nothing is stored", async () => {
    mswState.kbListResponses = [{ items: [], count: 0, totalPages: 1 }];
    renderPage();

    expect(await screen.findByText("No references yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        /upload your first pdf reference/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("0 references")).toBeInTheDocument();
  });

  it("surfaces list failures and recovers through Retry", async () => {
    const user = userEvent.setup();
    mswState.kbListErrorMode = "server-error";
    renderPage();

    expect(
      await screen.findByText("Unable to load the knowledge base"),
    ).toBeInTheDocument();

    mswState.kbListErrorMode = null;
    mswState.kbListResponses = [{ items: [kbDoc()], count: 1, totalPages: 1 }];
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Hypertension Guidelines")).toBeInTheDocument();
    expect(mswState.kbListHits).toHaveLength(2);
  });

  it("opens the embedded manager dialog from Upload Reference", async () => {
    const user = userEvent.setup();
    mswState.kbListResponses = [{ items: [kbDoc()], count: 1, totalPages: 1 }];
    renderPage();
    expect(await screen.findByText("Hypertension Guidelines")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /upload reference/i }));

    const dialog = screen.getByRole("dialog", { name: "Add to Knowledge Base" });
    expect(
      within(dialog).getByRole("heading", { name: "Chatbot Knowledge Base" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
