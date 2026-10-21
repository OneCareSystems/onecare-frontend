import apiClient from "./apiClient";

const KB_ENDPOINT = "/chatbot/knowledge-base";

/** Normalize backend document metadata for the Knowledge Base UI. */
export const normalizeDocument = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  const id = raw.id ?? raw.documentId ?? raw.pk ?? null;
  if (id === null || id === undefined) return null;

  return {
    id,
    title: raw.title ?? raw.name ?? raw.fileName ?? raw.filename ?? "Untitled",
    fileName: raw.fileName ?? raw.filename ?? raw.name ?? null,
    category: raw.category ?? null,
    description: raw.description ?? raw.desc ?? null,
    uploadedAt: raw.uploadedAt ?? raw.createdAt ?? raw.uploaded_at ?? null,
    sizeBytes: raw.sizeBytes ?? raw.size ?? null,
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
  const response = await apiClient.get(KB_ENDPOINT, { signal });
  return unwrapList(response.data).map(normalizeDocument).filter(Boolean);
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
