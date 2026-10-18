"use client";

import React, { useState } from 'react';
import { Flame, Trophy, Activity, Info, Calendar } from 'lucide-react';

interface DayItem {
    date: string;
    count: number;
    level: number;
    types: string[];
    day_of_week?: number;
}

interface BuilderHeatmapProps {
    activity: {
        total_contributions: number;
        current_streak_days: number;
        longest_streak_days: number;
        weeks: DayItem[][];
        start_date: string;
        end_date: string;
        recent_active_days?: any[];
    };
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const LEVEL_COLORS: Record<number, string> = {
    0: 'bg-[#151522] border-white/[0.03] hover:border-white/20',
    1: 'bg-sky-950/80 border-sky-800/40 hover:border-sky-400/60 shadow-[0_0_6px_rgba(14,165,233,0.1)]',
    2: 'bg-sky-700/80 border-sky-600/50 hover:border-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.2)]',
    3: 'bg-sky-500 border-sky-400 hover:border-white shadow-[0_0_10px_rgba(56,189,248,0.35)]',
    4: 'bg-emerald-400 border-emerald-300 hover:border-white shadow-[0_0_12px_rgba(52,211,153,0.5)]'
};

const TYPE_LABELS: Record<string, string> = {
    deliverable_approved: 'Deliverable Approved',
    task_completed: 'Task Completed',
    project_completed: 'Proof of Work Minted',
    peer_review_received: 'Peer Review Received'
};

export default function BuilderHeatmap({ activity }: BuilderHeatmapProps) {
    const [hoveredDay, setHoveredDay] = useState<DayItem | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

    const weeks = activity?.weeks || [];
    const total = activity?.total_contributions ?? 0;
    const currentStreak = activity?.current_streak_days ?? 0;
    const longestStreak = activity?.longest_streak_days ?? 0;

    // Build month label offsets across the 52 weeks
    const monthHeaders: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, wIdx) => {
        const firstDay = week[0];
        if (firstDay?.date) {
            const m = new Date(firstDay.date).getMonth();
            if (m !== lastMonth) {
                monthHeaders.push({ label: MONTH_NAMES[m], weekIndex: wIdx });
                lastMonth = m;
            }
        }
    });

    const handleMouseEnter = (day: DayItem, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredDay(day);
        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    };

    const handleMouseLeave = () => {
        setHoveredDay(null);
        setTooltipPos(null);
    };

    return (
        <div className="w-full rounded-2xl border border-border bg-[#0f111a] p-6 sm:p-7 mb-8 shadow-sm relative">
            {/* Header / Telemetry Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand" />
                        <h2 className="text-lg font-bold text-white tracking-tight">Verified Builder Ledger</h2>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Cryptographically backed contributions & deliverable milestones (Last 365 Days)
                    </p>
                </div>

                {/* Streak Badges */}
                <div className="flex items-center flex-wrap gap-2.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-semibold">
                        <Flame className="w-4 h-4 fill-orange-400/20" />
                        <span>{currentStreak} Day Streak</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 border border-brand/25 text-brand-light text-xs font-semibold">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{longestStreak} Day Record</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-200 text-xs font-medium">
                        <span className="font-bold text-white font-mono">{total}</span>
                        <span className="text-zinc-400">Total Events</span>
                    </div>
                </div>
            </div>

            {/* Matrix Grid Container */}
            <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
                <div className="inline-block min-w-[760px] select-none">
                    {/* Month Labels Bar */}
                    <div className="flex text-[11px] text-zinc-400 font-medium mb-2 pl-8 relative h-4">
                        {monthHeaders.map((mh, idx) => (
                            <span
                                key={idx}
                                className="absolute"
                                style={{ left: `${32 + mh.weekIndex * 14}px` }}
                            >
                                {mh.label}
                            </span>
                        ))}
                    </div>

                    {/* Heatmap Grid Row */}
                    <div className="flex items-start gap-1">
                        {/* Day of Week Labels */}
                        <div className="flex flex-col gap-1 pr-2 text-[10px] text-zinc-500 font-mono w-7 shrink-0 text-right">
                            {DAY_LABELS.map((label, dIdx) => (
                                <div key={dIdx} className="h-3 flex items-center justify-end">
                                    {label}
                                </div>
                            ))}
                        </div>

                        {/* Weeks Columns */}
                        <div className="flex gap-[3px]">
                            {weeks.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-col gap-[3px]">
                                    {week.map((day, dIdx) => {
                                        const colorClass = LEVEL_COLORS[day.level] || LEVEL_COLORS[0];
                                        return (
                                            <div
                                                key={dIdx}
                                                onMouseEnter={(e) => handleMouseEnter(day, e)}
                                                onMouseLeave={handleMouseLeave}
                                                className={`w-3 h-3 rounded-[3px] border transition-all duration-150 cursor-pointer ${colorClass}`}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Legend Row */}
            <div className="flex items-center justify-between text-xs text-zinc-400 mt-4 pt-4 border-t border-white/[0.05]">
                <div className="flex items-center gap-1.5 text-zinc-400">
                    <Info className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Every square is verified by project leads or Proof of Work minting.</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-zinc-500">Less</span>
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-[#151522] border border-white/[0.05]" />
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-sky-950 border border-sky-800/40" />
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-sky-700 border border-sky-600/50" />
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-sky-500 border border-sky-400" />
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-300" />
                    <span className="text-zinc-500">More</span>
                </div>
            </div>

            {/* Hover Tooltip Popover */}
            {hoveredDay && tooltipPos && (
                <div
                    className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-2 rounded-xl bg-[#181824] border border-white/[0.12] shadow-2xl text-xs text-white"
                    style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
                >
                    <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-brand" />
                        <span>{new Date(hoveredDay.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    <div className="text-brand-light font-mono text-[11px] mt-0.5 font-bold">
                        {hoveredDay.count === 0 ? 'No verified contributions' : `${hoveredDay.count} verified contribution${hoveredDay.count > 1 ? 's' : ''}`}
                    </div>

                    {hoveredDay.types && hoveredDay.types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-white/[0.08]">
                            {hoveredDay.types.map((t, idx) => (
                                <span
                                    key={idx}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-brand/15 border border-brand/25 text-brand-light font-medium"
                                >
                                    {TYPE_LABELS[t] || t}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
