import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./app/store";
import "./index.css";
import App from "./App.jsx";
import i18n from "./i18n";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate
        loading={<div role="status">{i18n.t("common.loading")}</div>}
        persistor={persistor}
      >
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>,
);
