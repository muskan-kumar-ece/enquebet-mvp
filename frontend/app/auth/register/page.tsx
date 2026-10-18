"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        full_name: '',
        password: '',
        password_confirm: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.password_confirm) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await register(formData);
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-blueprint-grid relative">
            <div className="w-full max-w-md relative z-10 animate-fade-in my-8">
                {/* Logo & Headline */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <Link href="/" className="mb-4 inline-block hover:scale-105 transition-transform">
                        <div className="p-3 rounded-2xl bg-[#0c0f1b] border border-[#1e263c] shadow-xl relative group">
                            <BrandLogo size="lg" mode="vector" priority />
                        </div>
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Join ENQUEbet</h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">Create your verified builder profile and start collaborating</p>
                </div>

                {/* Register Form */}
                <form onSubmit={handleSubmit} className="card space-y-4 border-border-default/90">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-text-secondary">Full Name</label>
                        <input
                            type="text"
                            required
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="input w-full"
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-text-secondary">Username</label>
                        <input
                            type="text"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="input w-full"
                            placeholder="johndoe"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-text-secondary">Email</label>
                        <input
                            type="email"
                            required
                            suppressHydrationWarning
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="input w-full"
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-text-secondary">Password</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="input w-full"
                            placeholder="At least 8 characters"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-text-secondary">Confirm Password</label>
                        <input
                            type="password"
                            required
                            value={formData.password_confirm}
                            onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                            className="input w-full"
                            placeholder="Re-enter password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full !py-2.5 font-semibold text-sm mt-2"
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>

                    <p className="text-center text-text-muted text-xs sm:text-sm pt-2">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-brand-light hover:text-white font-medium transition-colors">
                            Sign In
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
