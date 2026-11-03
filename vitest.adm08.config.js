import { mergeConfig } from "vitest/config";
import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "test/utils/clinicReports.test.js",
      "test/services/reportService.test.js",
      "test/pages/admin/adminClinicReports.test.jsx",
      "test/pages/admin/adminQueueReports.test.jsx",
      "test/pages/superAdmin/ClinicReportsPage.test.jsx",
      "test/pages/superAdmin/PharmacyReportsPage.test.jsx",
    ],
    coverage: {
      enabled: true,
      include: [
        "src/utils/clinicReports.js",
        "src/hooks/useClinicReport.js",
        "src/components/admin/ClinicReports.jsx",
        "src/services/reportService.js",
      ],
      reportsDirectory: "coverage/adm08",
      reporter: ["text", "json-summary", "html"],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});
