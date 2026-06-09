import { Outlet } from "react-router-dom";

const PublicLayout = () => {
  return (
    <div>
      {/* header / navbar here */}
      <Outlet />
      {/* footer here */}
    </div>
  );
};

export default PublicLayout;