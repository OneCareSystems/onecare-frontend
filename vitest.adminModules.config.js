import { mergeConfig } from "vitest/config";
import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "test/utils/adminWorkflows.test.js",
      "test/utils/demoClinicReports.test.js",
      "test/services/adminWorkflowService.test.js",
      "test/hooks/useAdminQueue.test.jsx",
      "test/hooks/usePatientOptions.test.jsx",
      "test/components/AutocompleteCombobox.test.jsx",
      "test/utils/clinicTime.test.js",
      "test/pages/admin/admin*.test.jsx",
    ],
    coverage: {
      enabled: true,
      include: [
        "src/utils/adminWorkflows.js",
        "src/utils/demoClinicReports.js",
        "src/utils/clinicTime.js",
        "src/components/AutocompleteCombobox.jsx",
        "src/services/adminWorkflowService.js",
        "src/hooks/useAdminQueue.js",
        "src/hooks/useWorkflowResource.js",
        "src/hooks/usePatientOptions.js",
        "src/components/admin/*.jsx",
        "src/pages/admin/BookAppointmentPage.jsx",
        "src/pages/admin/AppointmentHubPage.jsx",
        "src/pages/admin/BillingPage.jsx",
      ],
      reportsDirectory: "coverage/admin-modules",
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
        perFile: true,
      },
    },
  },
});
