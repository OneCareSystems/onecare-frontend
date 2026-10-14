import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { 
  persistStore, 
  persistReducer, 
  FLUSH, 
  REHYDRATE, 
  PAUSE, 
  PERSIST, 
  PURGE, 
  REGISTER 
} from "redux-persist";
import storageModule from "redux-persist/lib/storage";
const storage = storageModule.default || storageModule;
import authReducer from "../features/auth/authSlice";
import queueReducer from "../features/queue/queueSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  queue: queueReducer,
});

const persistConfig = {
  key: "root",
  version: 1,
  storage,
  whitelist: ["auth"], // Only persist the auth slice
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

/**
 * Test utility to create a fresh store without persistence.
 * Prevents state leaks and avoids PersistGate issues in tests.
 */
export const setupStore = (preloadedState) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
};
