import { mergeConfig } from "vitest/config";
import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "test/pages/admin/*.test.jsx",
      "test/utils/patient*.test.js",
      "test/services/patient*.test.js",
      "test/services/apiClient*.test.*",
      "test/layouts/*.test.jsx",
      "test/components/Sidebar.test.jsx",
      "test/components/TopBar.test.jsx",
      "test/components/ErrorMessage.test.jsx",
      "test/components/Toast.test.jsx",
      "test/routes/*.test.*",
    ],
    coverage: {
      enabled: true,
      include: [
        "src/components/PatientSearch.jsx",
        "src/components/PatientDemographicsEditor.jsx",
        "src/pages/admin/PatientSearchEditPage.jsx",
        "src/utils/patientSearch.js",
        "src/utils/patientValidation.js",
        "src/services/patientService.js",
      ],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage/adm03",
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
