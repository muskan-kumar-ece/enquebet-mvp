"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { AuthRobot } from '@/components/auth/AuthRobot';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Robot interactive state tracking
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [activeField, setActiveField] = useState<'email' | 'password' | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(formData.email, formData.password);
            setIsSuccess(true);
            // Brief pause to allow the robot celebration nod animation
            setTimeout(() => {
                router.push('/');
            }, 600);
        } catch (err: any) {
            setError(err.message || 'Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-blueprint-grid relative overflow-x-hidden">
            {/* Background cyber ambient gradients */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[360px] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />

            <div className="w-full max-w-md relative z-10 animate-fade-in my-6">
                {/* Brand Logo & Robot Mascot */}
                <div className="text-center mb-4 flex flex-col items-center">
                    <Link href="/" className="mb-3 inline-block hover:scale-105 transition-transform">
                        <div className="p-2.5 rounded-2xl bg-[#0c0f1b] border border-[#1e263c] shadow-xl relative group">
                            <BrandLogo size="md" mode="vector" priority />
                        </div>
                    </Link>

                    {/* Interactive 3D Robot Mascot */}
                    <AuthRobot
                        isPasswordFocused={isPasswordFocused}
                        isPasswordVisible={isPasswordVisible}
                        isTyping={activeField === 'email' && formData.email.length > 0}
                        typingLength={formData.email.length}
                        hasError={Boolean(error)}
                        errorMessage={error}
                        isLoading={loading}
                        isSuccess={isSuccess}
                        targetField={activeField}
                    />

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Welcome Back
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                        Sign in to your ENQUEbet builder workspace
                    </p>
                </div>

                {/* Login Form Card */}
                <form 
                    onSubmit={handleSubmit} 
                    className="card space-y-4 border-border-default/90 shadow-2xl bg-surface-elevation-1/95 backdrop-blur-md relative"
                >
                    {/* Email Input */}
                    <div>
                        <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-text-secondary">
                            Email Address
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                                <Mail className="w-4 h-4" />
                            </div>
                            <input
                                type="email"
                                required
                                suppressHydrationWarning
                                value={formData.email}
                                onFocus={() => {
                                    setActiveField('email');
                                    if (error) setError('');
                                }}
                                onBlur={() => setActiveField(null)}
                                onChange={(e) => {
                                    setFormData({ ...formData, email: e.target.value });
                                    if (error) setError('');
                                }}
                                className="input w-full pl-10"
                                placeholder="name@domain.com"
                            />
                        </div>
                    </div>

                    {/* Password Input with Robot Peek Sync */}
                    <PasswordInput
                        label="Password"
                        value={formData.password}
                        onChange={(e) => {
                            setFormData({ ...formData, password: e.target.value });
                            if (error) setError('');
                        }}
                        onFocus={() => {
                            setIsPasswordFocused(true);
                            setActiveField('password');
                            if (error) setError('');
                        }}
                        onBlur={() => {
                            setIsPasswordFocused(false);
                            setActiveField(null);
                        }}
                        onVisibilityChange={(isVisible) => setIsPasswordVisible(isVisible)}
                        placeholder="Enter your builder key"
                    />

                    {/* Sign In CTA Button */}
                    <button
                        type="submit"
                        disabled={loading || isSuccess}
                        className="btn-primary w-full !py-2.5 font-semibold text-sm flex items-center justify-center gap-2 mt-2 shadow-lg shadow-brand-primary/20 cursor-pointer disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Authenticating...</span>
                            </>
                        ) : isSuccess ? (
                            <span>Access Granted!</span>
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>

                    {/* Footer Nav */}
                    <p className="text-center text-text-muted text-xs sm:text-sm pt-2">
                        Don&apos;t have an account?{' '}
                        <Link 
                            href="/auth/register" 
                            className="text-brand-light hover:text-white font-medium transition-colors"
                        >
                            Create Builder Account
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
