"use client";

import { CheckCircle2, CircleAlert, Sparkles, ChevronRight } from 'lucide-react';

interface ProfileCompletenessProps {
    user: any;
    onStartEdit?: (field?: string) => void;
}

interface Criterion {
    key: string;
    label: string;
    points: number;
    completed: boolean;
    hint: string;
}

export default function ProfileCompletenessCard({ user, onStartEdit }: ProfileCompletenessProps) {
    if (!user) return null;

    const hasName = Boolean(user.full_name && user.full_name.trim().length > 0);
    const hasBio = Boolean(user.bio && user.bio.trim().length > 0);
    const hasHeadline = Boolean(user.headline && user.headline.trim().length > 0);
    const hasImage = Boolean((user.profile_image || user.avatar_url) && (user.profile_image || user.avatar_url).trim().length > 0);
    const hasSkills = Boolean(user.skills && user.skills.length > 0);
    const hasLocationOrCollege = Boolean((user.location && user.location.trim().length > 0) || (user.college && user.college.trim().length > 0));
    const hasLinks = Boolean(
        (user.linkedin_url && user.linkedin_url.trim().length > 0) ||
        (user.github_url && user.github_url.trim().length > 0) ||
        (user.portfolio_url && user.portfolio_url.trim().length > 0)
    );
    const hasPortfolioEntry = Boolean(
        (user.education && user.education.length > 0) ||
        (user.experience && user.experience.length > 0) ||
        (user.projects && user.projects.length > 0)
    );

    const criteria: Criterion[] = [
        { key: 'full_name', label: 'Full Name', points: 10, completed: hasName, hint: 'Add your full name' },
        { key: 'headline', label: 'Headline', points: 15, completed: hasHeadline, hint: 'Add your builder headline' },
        { key: 'bio', label: 'Bio', points: 15, completed: hasBio, hint: 'Write a short bio about what you build' },
        { key: 'avatar_url', label: 'Profile Picture', points: 15, completed: hasImage, hint: 'Upload an avatar' },
        { key: 'skills', label: 'Skills', points: 15, completed: hasSkills, hint: 'List your technical skills' },
        { key: 'location', label: 'Location or College', points: 10, completed: hasLocationOrCollege, hint: 'Add your location or university' },
        { key: 'links', label: 'Social Link', points: 10, completed: hasLinks, hint: 'Link GitHub, LinkedIn, or portfolio' },
        { key: 'projects', label: 'Experience or Projects', points: 10, completed: hasPortfolioEntry, hint: 'Add education, work, or projects' },
    ];

    const computedScore = criteria.reduce((sum, item) => sum + (item.completed ? item.points : 0), 0);
    const completenessScore = user.completeness_score !== undefined ? user.completeness_score : computedScore;
    const missingCriteria = criteria.filter((c) => !c.completed);

    if (completenessScore >= 100) {
        return (
            <div className="card mb-6 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-bg-card to-brand-primary/10 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Sparkles className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-text-primary">All-Star Builder Profile</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">100%</span>
                            </div>
                            <p className="text-xs text-text-secondary mt-0.5">Your profile is complete and optimized for discovery and collaborations.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card mb-6 border-border-light bg-bg-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-text-primary">Profile Completeness</h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-primary/15 text-brand-light font-bold border border-brand-primary/30">
                            {completenessScore}%
                        </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                        Complete your builder profile to increase collaboration opportunities and credibility.
                    </p>
                </div>
                {onStartEdit && (
                    <button
                        onClick={() => onStartEdit()}
                        className="text-xs text-brand-light hover:text-white font-medium flex items-center gap-1 shrink-0 self-start sm:self-auto"
                    >
                        <span>Improve Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden mb-4 border border-border-default">
                <div
                    className="h-full bg-gradient-to-r from-brand-primary to-brand-light rounded-full transition-all duration-500"
                    style={{ width: `${completenessScore}%` }}
                />
            </div>

            {/* Suggestions for missing items */}
            {missingCriteria.length > 0 && (
                <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-2">Recommended Next Steps</p>
                    <div className="flex flex-wrap gap-2">
                        {missingCriteria.slice(0, 4).map((item) => (
                            <button
                                key={item.key}
                                onClick={() => onStartEdit && onStartEdit(item.key)}
                                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-hover hover:bg-bg-hover-light border border-border-default hover:border-brand-primary/40 text-xs text-text-secondary hover:text-text-primary transition-all text-left"
                            >
                                <CircleAlert className="w-3.5 h-3.5 text-brand-light group-hover:scale-110 transition-transform" />
                                <span>{item.hint}</span>
                                <span className="text-[10px] text-brand-light font-medium bg-brand-primary/10 px-1 rounded">+{item.points}%</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
