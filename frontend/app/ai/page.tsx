import { Bot } from 'lucide-react';

export default function AIPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-blueprint-grid">
            <div className="card text-center max-w-md py-16 px-8 border border-border-default/80 shadow-2xl">
                <div className="w-16 h-16 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto mb-6">
                    <Bot className="w-8 h-8 text-brand-light" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight mb-2 text-text-primary">Quebet AI</h1>
                <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                    Intelligent co-pilot for automated task decomposition, spec drafting, and milestone tracking is coming soon.
                </p>
                <span className="pill text-xs font-mono border-brand-primary/20 text-brand-light bg-brand-primary/10">In Development</span>
            </div>
        </div>
    );
}
