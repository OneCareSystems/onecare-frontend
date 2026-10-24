import { mergeConfig } from "vitest/config";
import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: ["test/utils/adminDashboard.test.js", "test/pages/admin/adminDashboard.test.jsx"],
    coverage: {
      enabled: true,
      include: ["src/utils/adminDashboard.js", "src/hooks/useAdminDashboard.js", "src/pages/admin/AdminDashboardPage.jsx"],
      reportsDirectory: "coverage/adm01",
      reporter: ["text", "json-summary", "html"],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80, perFile: true },
    },
  },
});
