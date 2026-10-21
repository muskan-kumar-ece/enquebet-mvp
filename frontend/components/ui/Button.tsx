"use client";

import React, { forwardRef } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'brand' | 'outline' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    loadingText?: string;
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    brand: 'btn-brand',
    outline: 'btn-outline',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'bg-rose-600/90 hover:bg-rose-600 active:bg-rose-700 text-white border border-rose-500/40 shadow-sm active:scale-[0.97] transition-all duration-150',
};

const sizeClasses: Record<ButtonSize, string> = {
    xs: '!px-2.5 !py-1 !text-xs !rounded-md gap-1',
    sm: '!px-3 !py-1.5 !text-xs !rounded-lg gap-1.5',
    md: '!px-4 !py-2 !text-sm !rounded-lg gap-2',
    lg: '!px-5 !py-2.5 !text-base !rounded-xl gap-2.5',
};

const iconSizes: Record<ButtonSize, string> = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'brand',
            size = 'md',
            loading = false,
            loadingText,
            icon: Icon,
            iconPosition = 'left',
            fullWidth = false,
            disabled = false,
            className = '',
            type = 'button',
            ...props
        },
        ref
    ) => {
        const isDisabled = disabled || loading;

        return (
            <button
                ref={ref}
                type={type}
                disabled={isDisabled}
                data-loading={loading}
                aria-busy={loading}
                aria-disabled={isDisabled}
                className={`
                    ${variantClasses[variant]}
                    ${sizeClasses[size]}
                    ${fullWidth ? 'w-full' : ''}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'active:scale-[0.97]'}
                    transition-all duration-150 inline-flex items-center justify-center font-semibold select-none
                    ${className}
                `.trim()}
                {...props}
            >
                {loading ? (
                    <>
                        <Loader2 className={`${iconSizes[size]} animate-spin shrink-0`} />
                        <span>{loadingText || children}</span>
                    </>
                ) : (
                    <>
                        {Icon && iconPosition === 'left' && (
                            <Icon className={`${iconSizes[size]} shrink-0`} aria-hidden="true" />
                        )}
                        {children && <span>{children}</span>}
                        {Icon && iconPosition === 'right' && (
                            <Icon className={`${iconSizes[size]} shrink-0`} aria-hidden="true" />
                        )}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: LucideIcon;
    'aria-label': string;
    variant?: 'ghost' | 'outline' | 'brand' | 'primary' | 'secondary';
    size?: ButtonSize;
    loading?: boolean;
}

const iconButtonSizes: Record<ButtonSize, string> = {
    xs: 'p-1 rounded-md',
    sm: 'p-1.5 rounded-lg',
    md: 'p-2 rounded-lg',
    lg: 'p-2.5 rounded-xl',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    (
        {
            icon: Icon,
            'aria-label': ariaLabel,
            variant = 'ghost',
            size = 'md',
            loading = false,
            disabled = false,
            className = '',
            type = 'button',
            ...props
        },
        ref
    ) => {
        const isDisabled = disabled || loading;

        return (
            <button
                ref={ref}
                type={type}
                disabled={isDisabled}
                data-loading={loading}
                aria-busy={loading}
                aria-disabled={isDisabled}
                aria-label={ariaLabel}
                title={ariaLabel}
                className={`
                    ${variant === 'ghost' ? 'btn-icon' : variantClasses[variant]}
                    ${iconButtonSizes[size]}
                    ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'active:scale-90'}
                    transition-all duration-150 inline-flex items-center justify-center select-none
                    ${className}
                `.trim()}
                {...props}
            >
                {loading ? (
                    <Loader2 className={`${iconSizes[size]} animate-spin shrink-0`} />
                ) : (
                    <Icon className={`${iconSizes[size]} shrink-0`} aria-hidden="true" />
                )}
            </button>
        );
    }
);

IconButton.displayName = 'IconButton';
