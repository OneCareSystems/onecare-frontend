import { beforeEach, expect, it, vi } from "vitest";
import apiClient from "../../src/services/apiClient";
import {
  addKnowledgeLink,
  deleteDocument,
  getKnowledgeResource,
  listDocuments,
  listKnowledgeResources,
  normalizeDocument,
  removeKnowledgeResource,
  uploadDocument,
  uploadKnowledgePdf,
} from "../../src/services/knowledgeBaseService";

vi.mock("../../src/services/apiClient", () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
beforeEach(() => vi.resetAllMocks());

it("uses the authenticated Spring API for every operation", async () => {
  const result = { id: 7, status: "PENDING" };
  apiClient.get.mockResolvedValue({ data: { success: true, data: result } });
  apiClient.post.mockResolvedValue({ data: { success: true, data: result } });
  await listKnowledgeResources({ page: 2 });
  expect(apiClient.get).toHaveBeenCalledWith(
    "/chatbot/knowledge-base",
    expect.objectContaining({ params: { page: 2 } }),
  );
  expect(await getKnowledgeResource(7)).toEqual(result);
  expect(apiClient.get).toHaveBeenCalledWith("/chatbot/knowledge-base/7");
  await addKnowledgeLink("https://who.int/page");
  expect(apiClient.post).toHaveBeenCalledWith("/chatbot/knowledge-base/links", {
    url: "https://who.int/page",
  });
  const file = new File(["%PDF"], "guide.pdf");
  await uploadKnowledgePdf(file, "Guide");
  const [path, form, options] = apiClient.post.mock.calls.at(-1);
  expect(path).toBe("/chatbot/knowledge-base");
  expect(form.get("file")).toBe(file);
  expect(form.get("title")).toBe("Guide");
  expect(options.headers["Content-Type"]).toBeUndefined();
  await removeKnowledgeResource(7);
  expect(apiClient.delete).toHaveBeenCalledWith("/chatbot/knowledge-base/7");
});

it("normalizes every backend field alias and drops id-less records", () => {
  expect(normalizeDocument(null)).toBeNull();
  expect(normalizeDocument("nope")).toBeNull();
  expect(normalizeDocument({ title: "No id" })).toBeNull();

  const raw = {
    documentId: 9,
    name: "Named",
    originalFilename: "orig.pdf",
    desc: "Short description",
    uploaded_at: "2026-10-01T08:00:00",
    fileSize: 2048,
  };
  expect(normalizeDocument(raw)).toEqual({
    id: 9,
    title: "Named",
    fileName: "orig.pdf",
    category: null,
    description: "Short description",
    uploadedAt: "2026-10-01T08:00:00",
    sizeBytes: 2048,
    raw,
  });

  // A fully-populated backend record keeps its own values and falls back to
  // "Untitled" only when no title-ish field exists at all.
  const full = {
    id: 3,
    title: "Guidelines",
    fileName: "guidelines.pdf",
    category: "Cardiology",
    description: "Desc",
    createdAt: "2026-10-14T09:00:00",
    sizeBytes: 1024,
  };
  expect(normalizeDocument(full)).toMatchObject({
    id: 3,
    title: "Guidelines",
    fileName: "guidelines.pdf",
    category: "Cardiology",
    uploadedAt: "2026-10-14T09:00:00",
    sizeBytes: 1024,
  });
  expect(normalizeDocument({ pk: 1, fileName: "only-name.pdf" })).toMatchObject(
    { id: 1, title: "only-name.pdf", fileName: "only-name.pdf" },
  );
  expect(normalizeDocument({ id: 4 })).toMatchObject({ title: "Untitled" });
});

it("listDocuments walks every page, keeps PDFs and normalizes the items", async () => {
  apiClient.get
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [
            { id: 1, title: "PDF one", sourceType: "PDF" },
            { id: 2, title: "Web link", sourceType: "WEB" },
            { title: "No id here", sourceType: "PDF" },
          ],
          totalPages: 2,
        },
      },
    })
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [{ id: 3, name: "PDF two" }], // no sourceType: kept
          totalPages: 2,
        },
      },
    });

  const docs = await listDocuments();

  expect(docs.map((doc) => doc.id)).toEqual([1, 3]);
  expect(docs[1].title).toBe("PDF two");
  expect(apiClient.get).toHaveBeenCalledTimes(2);
  expect(apiClient.get).toHaveBeenNthCalledWith(
    1,
    "/chatbot/knowledge-base",
    expect.objectContaining({
      params: { page: 1, pageSize: 100, sourceType: "PDF" },
    }),
  );
  expect(apiClient.get).toHaveBeenNthCalledWith(
    2,
    "/chatbot/knowledge-base",
    expect.objectContaining({
      params: { page: 2, pageSize: 100, sourceType: "PDF" },
    }),
  );
});

it("uploadDocument posts multipart form data and normalizes the created record", async () => {
  const file = new File(["%PDF"], "guide.pdf", { type: "application/pdf" });
  apiClient.post.mockResolvedValue({
    data: {
      id: 501,
      originalFilename: "guide.pdf",
      sourceType: "PDF",
      status: "PENDING",
    },
  });

  const created = await uploadDocument(file);

  const [path, form, options] = apiClient.post.mock.calls.at(-1);
  expect(path).toBe("/chatbot/knowledge-base");
  expect(form.get("file")).toBe(file);
  expect(options.headers["Content-Type"]).toBe("multipart/form-data");
  expect(created).toMatchObject({
    id: 501,
    title: "guide.pdf",
    fileName: "guide.pdf",
  });
});

it("deleteDocument percent-encodes the id in the DELETE path", async () => {
  await deleteDocument("a b/c");
  expect(apiClient.delete).toHaveBeenCalledWith(
    "/chatbot/knowledge-base/a%20b%2Fc",
  );

  await deleteDocument(11);
  expect(apiClient.delete).toHaveBeenLastCalledWith(
    "/chatbot/knowledge-base/11",
  );
});
