"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { AuthRobot } from '@/components/auth/AuthRobot';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { User, AtSign, Mail, ArrowRight, Loader2 } from 'lucide-react';

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
    const [isSuccess, setIsSuccess] = useState(false);

    // Robot interactive state tracking
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [activeField, setActiveField] = useState<'name' | 'username' | 'email' | 'password' | 'confirm' | null>(null);

    // Get current typing length for the active text field
    const getActiveFieldLength = () => {
        switch (activeField) {
            case 'name': return formData.full_name.length;
            case 'username': return formData.username.length;
            case 'email': return formData.email.length;
            default: return 0;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.password_confirm) {
            setError('Passwords do not match. Please verify your keys.');
            return;
        }

        setLoading(true);

        try {
            await register(formData);
            setIsSuccess(true);
            // Brief pause for celebration nod animation
            setTimeout(() => {
                router.push('/');
            }, 650);
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please check your details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-blueprint-grid relative overflow-x-hidden">
            {/* Background cyber ambient gradients */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[540px] h-[380px] bg-brand-primary/10 rounded-full blur-[130px] pointer-events-none -z-10" />

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
                        isTyping={Boolean(activeField && activeField !== 'password' && activeField !== 'confirm' && getActiveFieldLength() > 0)}
                        typingLength={getActiveFieldLength()}
                        hasError={Boolean(error)}
                        errorMessage={error}
                        isLoading={loading}
                        isSuccess={isSuccess}
                        targetField={activeField}
                    />

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Join ENQUEbet
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                        Create your verified builder profile and start collaborating
                    </p>
                </div>

                {/* Register Form Card */}
                <form 
                    onSubmit={handleSubmit} 
                    className="card space-y-4 border-border-default/90 shadow-2xl bg-surface-elevation-1/95 backdrop-blur-md relative"
                >
                    {/* Social OAuth Sign Up (Google & GitHub) */}
                    <SocialAuthButtons
                        disabled={loading || isSuccess}
                        onActionStart={() => {
                            if (error) setError('');
                        }}
                    />

                    {/* Full Name */}
                    <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-text-secondary">
                            Full Name
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                                <User className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onFocus={() => {
                                    setActiveField('name');
                                    if (error) setError('');
                                }}
                                onBlur={() => setActiveField(null)}
                                onChange={(e) => {
                                    setFormData({ ...formData, full_name: e.target.value });
                                    if (error) setError('');
                                }}
                                className="input w-full pl-10"
                                placeholder="Kumar Sanu"
                            />
                        </div>
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-text-secondary">
                            Username
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                                <AtSign className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                required
                                value={formData.username}
                                onFocus={() => {
                                    setActiveField('username');
                                    if (error) setError('');
                                }}
                                onBlur={() => setActiveField(null)}
                                onChange={(e) => {
                                    setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '_') });
                                    if (error) setError('');
                                }}
                                className="input w-full pl-10 font-mono text-sm"
                                placeholder="kumar_builder"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-text-secondary">
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
                                placeholder="your@email.com"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <PasswordInput
                        label="Password"
                        value={formData.password}
                        minLength={8}
                        autoComplete="new-password"
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
                        placeholder="At least 8 characters"
                    />

                    {/* Confirm Password */}
                    <PasswordInput
                        label="Confirm Password"
                        value={formData.password_confirm}
                        autoComplete="new-password"
                        onChange={(e) => {
                            setFormData({ ...formData, password_confirm: e.target.value });
                            if (error) setError('');
                        }}
                        onFocus={() => {
                            setIsPasswordFocused(true);
                            setActiveField('confirm');
                            if (error) setError('');
                        }}
                        onBlur={() => {
                            setIsPasswordFocused(false);
                            setActiveField(null);
                        }}
                        onVisibilityChange={(isVisible) => setIsPasswordVisible(isVisible)}
                        placeholder="Re-enter your password"
                    />

                    {/* Create Account CTA Button */}
                    <button
                        type="submit"
                        disabled={loading || isSuccess}
                        className="btn-primary w-full !py-2.5 font-semibold text-sm flex items-center justify-center gap-2 mt-2 shadow-lg shadow-brand-primary/20 cursor-pointer disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Forging Profile...</span>
                            </>
                        ) : isSuccess ? (
                            <span>Profile Created!</span>
                        ) : (
                            <>
                                <span>Create Account</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>

                    {/* Footer Nav */}
                    <p className="text-center text-text-muted text-xs sm:text-sm pt-2">
                        Already have an account?{' '}
                        <Link 
                            href="/auth/login" 
                            className="text-brand-light hover:text-white font-medium transition-colors"
                        >
                            Sign In
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
