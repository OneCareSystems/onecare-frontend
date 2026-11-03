import { useSelector } from "react-redux";
import { selectRole } from "../../features/auth/authSlice";
import AdminQueuePanel from "../../components/admin/AdminQueuePanel";

const QueuePage = () => {
  const role = useSelector(selectRole);
  if (role === "ADMIN" || role === "SUPER_ADMIN") return <AdminQueuePanel />;
  return (
    <div>
      <h1>QueuePage</h1>
    </div>
  );
};

export default QueuePage;
