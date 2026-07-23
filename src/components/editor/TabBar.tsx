export interface OpenTab {
  id: string;
  path: string | null;
  name: string;
  code: string;
  savedCode: string;
}

interface TabBarProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelect, onClose }: TabBarProps) {
  if (tabs.length === 0) {
    return (
      <div className="tab-bar">
        <div className="tab">No file open</div>
      </div>
    );
  }

  return (
    <div className="tab-bar">
      {tabs.map((tab) => {
        const isDirty = tab.code !== tab.savedCode;
        return (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? "active" : ""}`}
            onClick={() => onSelect(tab.id)}
          >
            <span>{tab.name}</span>
            {isDirty && <span className="unsaved">●</span>}
            <span
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
            >
              ×
            </span>
          </div>
        );
      })}
    </div>
  );
}
