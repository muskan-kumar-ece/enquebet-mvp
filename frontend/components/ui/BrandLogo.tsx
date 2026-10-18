"use client";

import React from 'react';
import Image from 'next/image';

interface BrandLogoProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    variant?: 'mark' | 'full' | 'glow';
    mode?: 'vector' | 'raster';
    withText?: boolean;
    subtitle?: string;
    className?: string;
    priority?: boolean;
}

const SIZE_MAP = {
    xs: { dim: 20, px: 'w-5 h-5', text: 'text-sm', sub: 'text-[9px]' },
    sm: { dim: 26, px: 'w-6.5 h-6.5', text: 'text-base', sub: 'text-[10px]' },
    md: { dim: 34, px: 'w-8.5 h-8.5', text: 'text-lg', sub: 'text-[10px]' },
    lg: { dim: 48, px: 'w-12 h-12', text: 'text-2xl', sub: 'text-xs' },
    xl: { dim: 64, px: 'w-16 h-16', text: 'text-3xl', sub: 'text-sm' },
    '2xl': { dim: 80, px: 'w-20 h-20', text: 'text-4xl', sub: 'text-sm' },
};

/**
 * Architectural Geometric Vector Mark for ENQUEbet.
 * Precision-crafted queue bracket & "E" builder lettermark.
 * Crisp at all resolutions, zero raster blur, zero AI gloss.
 */
export function BrandMarkSvg({ size = 32, className = '' }: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-label="ENQUEbet Logo Mark"
        >
            {/* Outer structural boundary - tactical graphite tile with hairline rim */}
            <rect
                x="3"
                y="3"
                width="42"
                height="42"
                rx="11"
                fill="#0A0E1A"
                stroke="#1E2638"
                strokeWidth="1.5"
            />
            
            {/* Top inner rim highlight */}
            <line x1="14" y1="3.75" x2="34" y2="3.75" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="1" />

            {/* Left architectural spine (Chalk White) */}
            <path
                d="M13 13C13 11.8954 13.8954 11 15 11H19C20.1046 11 21 11.8954 21 13V35C21 36.1046 20.1046 37 19 37H15C13.8954 37 13 36.1046 13 35V13Z"
                fill="#F8FAFC"
            />
            {/* Spine top bevel highlight */}
            <path d="M13.5 13.5H20.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />

            {/* Top builder arm (Architect Electric Cobalt) */}
            <path
                d="M21 12H33C34.1046 12 35 12.8954 35 14V17C35 18.1046 34.1046 19 33 19H21V12Z"
                fill="#1864FF"
            />
            <path d="M22 13H33" stroke="#60A5FA" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />

            {/* Middle queue connector block (Floating builder bridge) */}
            <path
                d="M21 21.5H29C30.1046 21.5 31 22.3954 31 23.5V25.5C31 26.6046 30.1046 27.5 29 27.5H21V21.5Z"
                fill="#528BFF"
            />

            {/* Bottom builder arm (Architect Electric Cobalt) */}
            <path
                d="M21 30H33C34.1046 30 35 30.8954 35 32V35C35 36.1046 34.1046 37 33 37H21V30Z"
                fill="#1864FF"
            />
            
            {/* Precision crosshair registration dot - engineering aesthetic */}
            <circle cx="34" cy="24.5" r="1.5" fill="#1864FF" />
        </svg>
    );
}

export function BrandLogo({
    size = 'md',
    variant = 'mark',
    mode = 'vector',
    withText = false,
    subtitle,
    className = '',
    priority = false,
}: BrandLogoProps) {
    const config = SIZE_MAP[size] || SIZE_MAP.md;

    const logoMark = (
        <div
            className={`relative shrink-0 flex items-center justify-center select-none ${config.px} transition-all duration-200 group-hover:scale-105`}
        >
            {mode === 'vector' ? (
                <BrandMarkSvg size={config.dim} className="w-full h-full drop-shadow-sm" />
            ) : (
                <Image
                    src="/logo.png"
                    alt="ENQUEbet Logo"
                    width={config.dim}
                    height={config.dim}
                    className="w-full h-full object-contain filter drop-shadow-sm"
                    priority={priority}
                />
            )}
        </div>
    );

    if (!withText) {
        return <div className={`inline-flex items-center ${className}`}>{logoMark}</div>;
    }

    return (
        <div className={`inline-flex items-center gap-3 select-none group ${className}`}>
            {logoMark}
            <div className="flex flex-col leading-tight">
                <div className={`font-black tracking-tight text-white flex items-center ${config.text}`}>
                    <span className="text-[#F8FAFC]">ENQUE</span>
                    <span className="text-[#1864FF] font-black ml-0.5">
                        bet
                    </span>
                </div>
                {subtitle && (
                    <span className={`text-zinc-500 font-mono tracking-wider uppercase -mt-0.5 font-medium ${config.sub}`}>
                        {subtitle}
                    </span>
                )}
            </div>
        </div>
    );
}

export default BrandLogo;
