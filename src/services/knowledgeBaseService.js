import apiClient from "./apiClient";

const KB_ENDPOINT = "/chatbot/knowledge-base";

/** Normalize backend document metadata for the Knowledge Base UI. */
export const normalizeDocument = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  const id = raw.id ?? raw.documentId ?? raw.pk ?? null;
  if (id === null || id === undefined) return null;

  return {
    id,
    title:
      raw.title ??
      raw.name ??
      raw.originalFilename ??
      raw.fileName ??
      raw.filename ??
      "Untitled",
    fileName:
      raw.fileName ?? raw.filename ?? raw.originalFilename ?? raw.name ?? null,
    category: raw.category ?? null,
    description: raw.description ?? raw.desc ?? null,
    uploadedAt:
      raw.uploadedAt ??
      raw.createdAt ??
      raw.uploaded_at ??
      raw.created_at ??
      null,
    sizeBytes: raw.sizeBytes ?? raw.fileSize ?? raw.size ?? null,
    raw,
  };
};

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.documents)) return payload.documents;
  return [];
};

/** List knowledge-base documents. */
export const listDocuments = async ({ signal } = {}) => {
  const pageSize = 100;
  const documents = [];
  let page = 1;

  while (true) {
    const result = await listKnowledgeResources(
      { page, pageSize, sourceType: "PDF" },
      { signal },
    );
    const items = unwrapList(result?.items ? { items: result.items } : result);
    documents.push(
      ...items
        .filter((item) => !item.sourceType || item.sourceType === "PDF")
        .map(normalizeDocument)
        .filter(Boolean),
    );
    const totalPages = Number(result?.totalPages) || 1;
    if (page >= totalPages || signal?.aborted) break;
    page += 1;
  }

  return documents;
};

/** Upload a PDF document to the knowledge base. */
export const uploadDocument = async (file) => {
  const body = new FormData();
  body.append("file", file);

  const response = await apiClient.post(KB_ENDPOINT, body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return normalizeDocument(response.data);
};

/** Delete a knowledge-base document by ID. */
export const deleteDocument = async (id) => {
  await apiClient.delete(`${KB_ENDPOINT}/${encodeURIComponent(id)}`);
};

export default { listDocuments, uploadDocument, deleteDocument };

const data = (response) => {
  if (!response.data?.success || !response.data.data)
    throw new Error("Unexpected knowledge base response.");
  return response.data.data;
};

export const listKnowledgeResources = async (params, { signal } = {}) =>
  data(await apiClient.get(KB_ENDPOINT, { params, signal }));
export const getKnowledgeResource = async (id) =>
  data(await apiClient.get(`${KB_ENDPOINT}/${id}`));
export const addKnowledgeLink = async (url) =>
  data(await apiClient.post(`${KB_ENDPOINT}/links`, { url }));
export const uploadKnowledgePdf = async (file, title = "") => {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  return data(
    await apiClient.post(KB_ENDPOINT, form, {
      headers: { "Content-Type": undefined },
    }),
  );
};
export const removeKnowledgeResource = async (id) => {
  await apiClient.delete(`${KB_ENDPOINT}/${id}`);
};
