"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(formData.email, formData.password);
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-blueprint-grid relative">
            <div className="w-full max-w-md relative z-10 animate-fade-in">
                {/* Logo & Headline */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <Link href="/" className="mb-4 inline-block hover:scale-105 transition-transform">
                        <div className="p-3 rounded-2xl bg-[#0c0f1b] border border-[#1e263c] shadow-xl relative group">
                            <BrandLogo size="lg" mode="vector" priority />
                        </div>
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Welcome Back</h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">Sign in to your ENQUEbet builder workspace</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="card space-y-5 border-border-default/90">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-text-secondary">Email</label>
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
                        <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-text-secondary">Password</label>
                        <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="input w-full"
                            placeholder="Enter your password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full !py-2.5 font-semibold text-sm"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <p className="text-center text-text-muted text-xs sm:text-sm">
                        Don&apos;t have an account?{' '}
                        <Link href="/auth/register" className="text-brand-light hover:text-white font-medium transition-colors">
                            Create Account
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
