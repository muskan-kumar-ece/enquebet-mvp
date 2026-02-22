import { GraduationCap } from 'lucide-react';

export default function CoursesPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="card text-center max-w-md py-16 px-8">
                <GraduationCap className="w-16 h-16 text-purple mx-auto mb-6" />
                <h1 className="text-3xl font-bold mb-3">Courses</h1>
                <p className="text-text-secondary mb-6">
                    Curated courses and learning paths for students will be available here soon.
                </p>
                <span className="pill text-sm">Coming Soon</span>
            </div>
        </div>
    );
}
