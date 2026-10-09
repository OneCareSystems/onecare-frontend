import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "../src/app/store";
import App from "../src/App";

describe("Sample Test", () => {
  it("should pass", () => {
    expect(1 + 1).toBe(2);
  });

  it("should render App component", () => {
    // <Provider> lives in src/main.jsx, so tests that render <App /> directly
    // must provide the store themselves (SessionManager uses useSelector).
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
  });
});