"use client";

interface FeedTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
    const tabs = [
        { id: 'public', label: 'Public' },
        { id: 'college', label: 'College' },
        { id: 'openidea', label: 'Open Idea' },
    ];

    return (
        <div className="card !py-2 !px-2">
            <div className="flex gap-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id
                                ? 'bg-purple/15 text-purple-light shadow-sm'
                                : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
