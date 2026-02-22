import { Bot } from 'lucide-react';

export default function AIPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="card text-center max-w-md py-16 px-8">
                <Bot className="w-16 h-16 text-purple mx-auto mb-6" />
                <h1 className="text-3xl font-bold mb-3">Quebet AI</h1>
                <p className="text-text-secondary mb-6">
                    AI-powered assistance for your projects is coming soon. Stay tuned!
                </p>
                <span className="pill text-sm">Coming Soon</span>
            </div>
        </div>
    );
}
