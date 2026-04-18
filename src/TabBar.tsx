import type { Tab } from "./types";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
}

export function TabBar({ tabs, activeTabId, onSwitch, onClose, onAdd }: TabBarProps) {
  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? "active" : ""}`}
            onClick={() => onSwitch(tab.id)}
            title={tab.label}
          >
            <span className="tab-label">{tab.label}</span>
            {tabs.length > 1 && (
              <span
                className="tab-close"
                role="button"
                aria-label={`Close ${tab.label}`}
                onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
              >
                ×
              </span>
            )}
          </button>
        ))}
      </div>
      <button className="tab-add" onClick={onAdd} title="New tab" aria-label="Open new tab">
        +
      </button>
    </div>
  );
}
