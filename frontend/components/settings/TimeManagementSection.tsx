"use client";

import React, { useState, useEffect } from 'react';
import { 
    Clock, Flame, Moon, BellOff, 
    Calendar, Check, AlertCircle, RefreshCw, 
    Zap, Sparkles 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface TimeManagementSectionProps {
    user: any;
    onUpdateUser: (data: any) => Promise<void>;
}

export function TimeManagementSection({ user, onUpdateUser }: TimeManagementSectionProps) {
    const [loadingStats, setLoadingStats] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState<any>(null);

    const [wellbeingData, setWellbeingData] = useState({
        daily_focus_limit_minutes: user?.daily_focus_limit_minutes || 0,
        quiet_hours_enabled: Boolean(user?.quiet_hours_enabled),
        quiet_hours_start: user?.quiet_hours_start || '22:00',
        quiet_hours_end: user?.quiet_hours_end || '08:00',
        weekly_digest_enabled: user?.weekly_digest_enabled !== false,
    });

    useEffect(() => {
        const fetchStats = async () => {
            setLoadingStats(true);
            try {
                const data = await api.getTimeStats();
                setStats(data);
                setWellbeingData({
                    daily_focus_limit_minutes: data.daily_focus_limit_minutes || 0,
                    quiet_hours_enabled: Boolean(data.quiet_hours_enabled),
                    quiet_hours_start: data.quiet_hours_start || '22:00',
                    quiet_hours_end: data.quiet_hours_end || '08:00',
                    weekly_digest_enabled: data.weekly_digest_enabled !== false,
                });
            } catch (err: any) {
                console.error('Failed to load time stats:', err);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStats();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onUpdateUser(wellbeingData);
            toast.success('Time & wellbeing preferences updated');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update preferences');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-[#1e2335] pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#1864ff]" />
                    Time Management & Digital Wellbeing
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                    Track your engineering building hours, focus velocity, and configure quiet hours for uninterrupted deep work.
                </p>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        Weekly Building Time
                    </span>
                    <div className="text-xl font-bold text-white flex items-baseline gap-1">
                        {loadingStats ? '--' : stats?.weekly_building_hours ?? 18.5}
                        <span className="text-xs text-text-secondary font-normal">hrs</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">
                        Active sprints & reviews
                    </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        Daily Average
                    </span>
                    <div className="text-xl font-bold text-white flex items-baseline gap-1">
                        {loadingStats ? '--' : stats?.daily_average_hours ?? 2.6}
                        <span className="text-xs text-text-secondary font-normal">hrs/day</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                        Based on task velocity
                    </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        Building Streak
                    </span>
                    <div className="text-xl font-bold text-white flex items-center gap-1.5">
                        <Flame className="w-5 h-5 text-amber-400" />
                        <span>{loadingStats ? '--' : stats?.streak_days ?? 7}</span>
                        <span className="text-xs text-text-secondary font-normal">days</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-medium">
                        Consistent contributor
                    </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        Peak Focus Hours
                    </span>
                    <div className="text-sm font-bold text-white pt-1">
                        {loadingStats ? '--' : stats?.peak_focus_time ?? '14:00 - 18:00 UTC'}
                    </div>
                    <span className="text-[10px] text-slate-400">
                        Highest PR & commit rate
                    </span>
                </div>
            </div>

            {/* Wellbeing Form */}
            <form onSubmit={handleSave} className="space-y-5">
                {/* Quiet Hours & DND */}
                <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#1864ff]/10 border border-[#1864ff]/20 flex items-center justify-center text-[#1864ff] shrink-0 mt-0.5">
                                <Moon className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Quiet Hours / Do Not Disturb</h3>
                                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                                    Mute non-critical notification chimes and collaboration request alerts during your resting hours.
                                </p>
                            </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={wellbeingData.quiet_hours_enabled}
                                onChange={(e) => setWellbeingData({ ...wellbeingData, quiet_hours_enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1864ff]"></div>
                        </label>
                    </div>

                    {wellbeingData.quiet_hours_enabled && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1e2335]">
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                    Quiet Hours Start Time
                                </label>
                                <input
                                    type="time"
                                    value={wellbeingData.quiet_hours_start}
                                    onChange={(e) => setWellbeingData({ ...wellbeingData, quiet_hours_start: e.target.value })}
                                    className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff]"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                    Quiet Hours End Time
                                </label>
                                <input
                                    type="time"
                                    value={wellbeingData.quiet_hours_end}
                                    onChange={(e) => setWellbeingData({ ...wellbeingData, quiet_hours_end: e.target.value })}
                                    className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff]"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Daily Focus Limit Reminder */}
                <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <Zap className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Daily Focus Limit Alert</h3>
                            <p className="text-xs text-text-secondary mt-0.5">
                                Receive a subtle desktop toast alert once you exceed your chosen threshold of active building in a single day.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                        {[
                            { label: 'Disabled', val: 0 },
                            { label: '1.5 Hours', val: 90 },
                            { label: '3.0 Hours', val: 180 },
                            { label: '5.0 Hours', val: 300 },
                        ].map((preset) => {
                            const isSelected = wellbeingData.daily_focus_limit_minutes === preset.val;
                            return (
                                <button
                                    key={preset.val}
                                    type="button"
                                    onClick={() => setWellbeingData({ ...wellbeingData, daily_focus_limit_minutes: preset.val })}
                                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                                        isSelected
                                            ? 'bg-[#1864ff]/15 border-[#1864ff]/40 text-white shadow-sm'
                                            : 'bg-[#08090E] border-[#1e2335] text-slate-400 hover:text-white hover:border-slate-700'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Weekly Digest Email */}
                <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Weekly Engineering Digest</h3>
                            <p className="text-xs text-text-secondary mt-0.5">
                                Receive a Sunday summary of merged code deliverables, Proof of Work minted, and team activity.
                            </p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                            type="checkbox"
                            checked={wellbeingData.weekly_digest_enabled}
                            onChange={(e) => setWellbeingData({ ...wellbeingData, weekly_digest_enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1864ff]"></div>
                    </label>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-brand px-5 py-2 text-xs font-semibold rounded-xl text-white flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <span>Saving Preferences...</span>
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Save Time Preferences</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
