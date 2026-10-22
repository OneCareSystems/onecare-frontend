import { beforeEach, expect, it, vi } from "vitest";
import apiClient from "../../src/services/apiClient";
import {
  addKnowledgeLink,
  getKnowledgeResource,
  listKnowledgeResources,
  removeKnowledgeResource,
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
