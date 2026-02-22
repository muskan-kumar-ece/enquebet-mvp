import { FileText } from 'lucide-react';

export default function ResearchPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="text-center">
                <FileText className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-30" />
                <h1 className="text-2xl font-bold mb-2">Research Hub</h1>
                <p className="text-text-muted max-w-md mx-auto">
                    Coming Soon — Share and discover research papers, studies, and academic work with the ENQUEbet community.
                </p>
            </div>
        </div>
    );
}
