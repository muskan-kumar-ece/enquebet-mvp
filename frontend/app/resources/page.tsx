import { Download } from 'lucide-react';

export default function ResourcesPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="card text-center max-w-md py-16 px-8">
                <Download className="w-16 h-16 text-purple mx-auto mb-6" />
                <h1 className="text-3xl font-bold mb-3">Resources</h1>
                <p className="text-text-secondary mb-6">
                    Downloadable templates, guides, and tools for your projects will be shared here.
                </p>
                <span className="pill text-sm">Coming Soon</span>
            </div>
        </div>
    );
}
