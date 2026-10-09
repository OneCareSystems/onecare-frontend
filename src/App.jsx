import { BrowserRouter } from "react-router-dom";
import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import SessionManager from "./features/auth/SessionManager.jsx";
import LanguageDocumentSync from "./LanguageDocumentSync.jsx";
function App() {
  return (
    <BrowserRouter>
      <>
      <LanguageDocumentSync />

      {/* Existing routes and layout go here */}
    </>
     <SessionManager />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
