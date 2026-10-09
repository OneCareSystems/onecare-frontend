import { BrowserRouter } from "react-router-dom";
import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import SessionManager from "./features/auth/sessionManager"
function App() {
  return (
    <BrowserRouter>
     <SessionManager />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
