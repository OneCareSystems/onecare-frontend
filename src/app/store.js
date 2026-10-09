import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";

/**
 * Single application store (Step 8 — never create more than one).
 * Register each new feature reducer here as it is migrated.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});
