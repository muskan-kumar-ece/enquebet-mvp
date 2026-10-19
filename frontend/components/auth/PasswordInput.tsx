"use client";

import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    minLength?: number;
    onFocus?: () => void;
    onBlur?: () => void;
    onVisibilityChange?: (isVisible: boolean) => void;
    autoComplete?: string;
}

export function PasswordInput({
    label,
    value,
    onChange,
    placeholder = '••••••••',
    required = true,
    minLength,
    onFocus,
    onBlur,
    onVisibilityChange,
    autoComplete = 'current-password',
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    const handleToggle = () => {
        const nextState = !showPassword;
        setShowPassword(nextState);
        if (onVisibilityChange) {
            onVisibilityChange(nextState);
        }
    };

    return (
        <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-text-secondary">
                {label}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Lock className="w-4 h-4" />
                </div>

                <input
                    type={showPassword ? 'text' : 'password'}
                    required={required}
                    minLength={minLength}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className="input w-full pl-10 pr-10 font-mono tracking-wide placeholder:font-sans placeholder:tracking-normal"
                />

                <button
                    type="button"
                    onClick={handleToggle}
                    tabIndex={-1}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}
