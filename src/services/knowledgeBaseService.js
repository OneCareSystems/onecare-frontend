import apiClient from "./apiClient";

const BASE = "/chatbot/knowledge-base";
const data = (response) => {
  if (!response.data?.success || !response.data.data)
    throw new Error("Unexpected knowledge base response.");
  return response.data.data;
};

export const listKnowledgeResources = async (params, { signal } = {}) =>
  data(await apiClient.get(BASE, { params, signal }));
export const getKnowledgeResource = async (id) =>
  data(await apiClient.get(`${BASE}/${id}`));
export const addKnowledgeLink = async (url) =>
  data(await apiClient.post(`${BASE}/links`, { url }));
export const uploadKnowledgePdf = async (file, title = "") => {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  return data(
    await apiClient.post(BASE, form, {
      headers: { "Content-Type": undefined },
    }),
  );
};
export const removeKnowledgeResource = async (id) => {
  await apiClient.delete(`${BASE}/${id}`);
};
