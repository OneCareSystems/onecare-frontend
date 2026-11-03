import KnowledgeBaseManager from "../../components/chatbot/KnowledgeBaseManager";

export default function KnowledgeBaseManagementPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Chatbot Knowledge Base Management</h1>
      <KnowledgeBaseManager />
    </div>
  );
}
