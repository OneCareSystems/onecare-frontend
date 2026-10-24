import { defineConfig } from "vitest/config";
import base from "./vite.config.js";
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: [
      "test/pages/public/patient*.test.jsx",
      "test/pages/HomePage.test.jsx",
      "test/chatbot/**/*.test.js",
      "test/public/**/*.test.{js,jsx}",
    ],
    coverage: {
      ...base.test.coverage,
      include: [
        "src/pages/public/{HomePage,BookingPage,BookingConfirmedPage,NotFoundPage}.jsx",
        "src/services/publicBookingService.js",
        "src/components/chatbot/{api,onecare-chat-widget}.js",
        "src/components/{ClinicContact,PublicErrorBoundary}.jsx",
        "src/utils/{bookingNavigation,publicDateTime,sriLankanPhone}.js",
      ],
      thresholds: {
        perFile: true,
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
