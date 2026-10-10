import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

const Tabs = ({
  tabs = [],
  defaultActiveTab,
  activeTab,
  onChange,
  ariaLabel,
  className = "",
}) => {
  const { t } = useTranslation();
  const generatedId = useId();

  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultActiveTab ?? tabs[0]?.id
  );

  const selectedTab = activeTab ?? internalActiveTab;
  const activeTabExists = tabs.some((tab) => tab.id === selectedTab);
  const currentTab = activeTabExists ? selectedTab : tabs[0]?.id;

  if (tabs.length === 0) return null;

  const handleTabChange = (tabId) => {
    if (activeTab === undefined) {
      setInternalActiveTab(tabId);
    }
    onChange?.(tabId);
  };

  const activeTabData = tabs.find((tab) => tab.id === currentTab);
  const resolvedAriaLabel = ariaLabel ?? t("common.tabs");

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={resolvedAriaLabel}
        className="flex gap-1 overflow-x-auto border-b border-neutral-200"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === currentTab;
          const tabId = `${generatedId}-tab-${tab.id}`;
          const panelId = `${generatedId}-panel-${tab.id}`;

          return (
            <button
              key={tab.id}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabChange(tab.id)}
              className={[
                "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                isActive
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-neutral-600 hover:text-neutral-900",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id={`${generatedId}-panel-${currentTab}`}
        role="tabpanel"
        aria-labelledby={`${generatedId}-tab-${currentTab}`}
        tabIndex={0}
        className="py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        {activeTabData?.content}
      </div>
    </div>
  );
};

export default Tabs;
