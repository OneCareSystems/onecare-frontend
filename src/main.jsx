import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./app/store";
import "./index.css";
import App from "./App.jsx";
import "./i18n";
import { loadRuntimeConfig, resolveApiBaseUrl } from "./services/config";
import apiClient from "./services/apiClient";

// DKR-03: read the runtime configuration (/config.json) before the first
// render so one image works in staging and production without a rebuild.
// A missing or broken file falls back to build-time defaults — never blocks.
const start = async () => {
  await loadRuntimeConfig();
  // The Axios client was created at module load with build-time values;
  // refresh its base URL now that the runtime file (if any) is known.
  apiClient.defaults.baseURL = resolveApiBaseUrl();

  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <Provider store={store}>
        <PersistGate
          loading={<div>Loading Session...</div>}
          persistor={persistor}
        >
          <App />
        </PersistGate>
      </Provider>
    </StrictMode>,
  );
};

start();
