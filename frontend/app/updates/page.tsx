import { RefreshCw } from 'lucide-react';

export default function UpdatesPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-blueprint-grid">
            <div className="card text-center max-w-md py-16 px-8 border border-border-default/80 shadow-2xl">
                <div className="w-16 h-16 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto mb-6">
                    <RefreshCw className="w-8 h-8 text-brand-light" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight mb-2 text-text-primary">System Changelog</h1>
                <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                    Platform updates, engineering release notes, and protocol announcements will be posted here.
                </p>
                <span className="pill text-xs font-mono border-brand-primary/20 text-brand-light bg-brand-primary/10">Coming Soon</span>
            </div>
        </div>
    );
}
