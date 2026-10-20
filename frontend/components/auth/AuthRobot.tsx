"use client";

import { useEffect, useState, useRef, useId } from 'react';
import { ShieldCheck, AlertCircle, Sparkles, Eye } from 'lucide-react';

export interface AuthRobotProps {
    isPasswordFocused: boolean;
    isPasswordVisible?: boolean;
    isTyping?: boolean;
    typingLength?: number;
    hasError?: boolean;
    isSuccess?: boolean;
    isLoading?: boolean;
    errorMessage?: string;
    targetField?: 'email' | 'username' | 'name' | 'password' | 'confirm' | null;
}

export function AuthRobot({
    isPasswordFocused,
    isPasswordVisible = false,
    isTyping = false,
    typingLength = 0,
    hasError = false,
    isSuccess = false,
    isLoading = false,
    errorMessage,
    targetField,
}: AuthRobotProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const clipId = useId().replace(/:/g, '');

    // Mouse tracking normalized coordinates (-1 to 1)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isBlinking, setIsBlinking] = useState(false);
    const [shakeKey, setShakeKey] = useState(0);
    const [prevHasError, setPrevHasError] = useState(hasError);

    // Trigger head shake whenever hasError flips to true
    if (hasError !== prevHasError) {
        setPrevHasError(hasError);
        if (hasError) {
            setShakeKey((prev) => prev + 1);
        }
    }

    // Natural blinking cycle every 4-5 seconds
    useEffect(() => {
        if (isPasswordFocused || hasError || isLoading) return;

        const blinkInterval = setInterval(() => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), 160);
        }, 4200);

        return () => clearInterval(blinkInterval);
    }, [isPasswordFocused, hasError, isLoading]);

    // Track mouse position across window
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current || isPasswordFocused) return;

            const rect = containerRef.current.getBoundingClientRect();
            const robotCenterX = rect.left + rect.width / 2;
            const robotCenterY = rect.top + rect.height / 2;

            // Normalized distance clamped between -1 and 1
            const rawX = (e.clientX - robotCenterX) / (window.innerWidth / 2);
            const rawY = (e.clientY - robotCenterY) / (window.innerHeight / 2);

            const clampedX = Math.max(-1, Math.min(1, rawX));
            const clampedY = Math.max(-1, Math.min(1, rawY));

            setMousePos({ x: clampedX, y: clampedY });
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isPasswordFocused]);

    // Calculate gaze and head rotation angles
    let targetX = mousePos.x;
    let targetY = mousePos.y;

    if (isPasswordFocused) {
        // Look slightly up/nervous when covering eyes
        targetX = isPasswordVisible ? 0.4 : 0;
        targetY = -0.3;
    } else if (isTyping || targetField) {
        // Look down at form input, shifting left-to-right as characters are typed
        const progressX = Math.min(1, Math.max(-1, -0.5 + (typingLength * 0.08)));
        targetX = progressX;
        targetY = 0.65;
    } else if (isLoading) {
        targetX = 0;
        targetY = 0;
    }

    const headRotateY = targetX * 18; // Degrees
    const headRotateX = -targetY * 14;
    const pupilOffsetX = targetX * 9; // Pixels
    const pupilOffsetY = targetY * 6;

    // Determine status colors
    let eyeColor = '#00f0ff'; // Cyber Cyan
    let eyeGlow = 'rgba(0, 240, 255, 0.6)';
    let antennaLed = '#1864ff';

    if (hasError) {
        eyeColor = '#f43f5e'; // Rose / Amber-Red
        eyeGlow = 'rgba(244, 63, 94, 0.7)';
        antennaLed = '#f43f5e';
    } else if (isSuccess) {
        eyeColor = '#10b981'; // Emerald Green
        eyeGlow = 'rgba(16, 185, 129, 0.7)';
        antennaLed = '#10b981';
    } else if (isLoading) {
        eyeColor = '#38bdf8';
        eyeGlow = 'rgba(56, 189, 248, 0.8)';
        antennaLed = '#38bdf8';
    }

    // Hand positioning
    // Idle: lowered down
    // Password focused: raised up covering eyes
    // Password visible (peeking): one hand slightly lowered
    const isPeeking = isPasswordFocused && isPasswordVisible;

    const leftHandTransform = isPasswordFocused
        ? 'translateY(-76px) translateX(24px) rotate(-22deg)'
        : 'translateY(0px) translateX(0px) rotate(0deg)';

    const rightHandTransform = isPasswordFocused
        ? isPeeking
            ? 'translateY(-48px) translateX(-18px) rotate(14deg)' // Peeking aside!
            : 'translateY(-76px) translateX(-24px) rotate(22deg)'
        : 'translateY(0px) translateX(0px) rotate(0deg)';

    return (
        <div ref={containerRef} className="relative flex flex-col items-center justify-center select-none mb-2">
            {/* Ambient cyber glow behind robot */}
            <div 
                className="absolute w-44 h-44 rounded-full blur-3xl pointer-events-none transition-all duration-500 -z-10"
                style={{
                    backgroundColor: hasError 
                        ? 'rgba(244, 63, 94, 0.15)' 
                        : isSuccess 
                            ? 'rgba(16, 185, 129, 0.15)' 
                            : 'rgba(24, 100, 255, 0.18)'
                }}
            />

            {/* Speech Bubble / Status Badge */}
            <div className="h-9 mb-1.5 flex items-center justify-center">
                {hasError ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium shadow-lg animate-in zoom-in-95 duration-150">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errorMessage || 'Access Denied: Invalid Credentials'}</span>
                    </div>
                ) : isSuccess ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium shadow-lg animate-in zoom-in-95 duration-150">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Verified! Initializing Workspace...</span>
                    </div>
                ) : isPeeking ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/25 text-brand-light text-[11px] font-mono shadow-sm">
                        <Eye className="w-3 h-3 text-brand-light" />
                        <span>*Peeking curiously*</span>
                    </div>
                ) : isPasswordFocused ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-elevation-2 border border-border-default text-text-muted text-[11px] font-mono shadow-sm">
                        <span>I promise not to look!</span>
                    </div>
                ) : isTyping ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-light text-[11px] font-mono">
                        <Sparkles className="w-3 h-3 animate-spin" />
                        <span>Inspecting telemetry...</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-elevation-2/60 border border-border-default/50 text-[10.5px] font-mono text-text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-light animate-pulse" />
                        <span>VenopBot v2.4 Online</span>
                    </div>
                )}
            </div>

            {/* 3D Perspective Stage */}
            <div 
                className="relative w-48 h-44 flex items-center justify-center"
                style={{ perspective: '800px' }}
            >
                {/* Floating Head & Chassis */}
                <div 
                    key={shakeKey}
                    className={`relative w-40 h-36 transition-transform duration-100 ease-out ${
                        hasError ? 'animate-robot-shake' : isSuccess ? 'animate-robot-nod' : 'animate-robot-float'
                    }`}
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: !hasError && !isSuccess 
                            ? `rotateY(${headRotateY}deg) rotateX(${headRotateX}deg)` 
                            : undefined,
                    }}
                >
                    {/* SVG Vector Robot */}
                    <svg
                        viewBox="0 0 200 180"
                        className="w-full h-full drop-shadow-2xl overflow-visible"
                    >
                        <defs>
                            {/* Metallic Head Gradient */}
                            <linearGradient id="headMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#1e2740" />
                                <stop offset="50%" stopColor="#121727" />
                                <stop offset="100%" stopColor="#0b0e19" />
                            </linearGradient>

                            {/* Visor Glass Gradient */}
                            <linearGradient id="visorGlass" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#05070c" />
                                <stop offset="100%" stopColor="#0a0f1d" />
                            </linearGradient>

                            {/* Hand Metallic Gradient */}
                            <linearGradient id="handMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2b3655" />
                                <stop offset="100%" stopColor="#151b2c" />
                            </linearGradient>

                            {/* Eye Clip Path */}
                            <clipPath id={`visorClip-${clipId}`}>
                                <rect x="38" y="55" width="124" height="48" rx="16" />
                            </clipPath>
                        </defs>

                        {/* --- Robot Antenna --- */}
                        <g className="antenna">
                            <line
                                x1="100"
                                y1="36"
                                x2="100"
                                y2="16"
                                stroke="#222c48"
                                strokeWidth="4"
                                strokeLinecap="round"
                            />
                            {/* Antenna Status Orb */}
                            <circle
                                cx="100"
                                cy="13"
                                r="6"
                                fill={antennaLed}
                                className={isLoading ? 'animate-ping' : 'animate-antenna-pulse'}
                                style={{
                                    filter: `drop-shadow(0 0 6px ${antennaLed})`,
                                    transition: 'fill 0.3s ease',
                                }}
                            />
                        </g>

                        {/* --- Robot Ear Cups (Side Ports) --- */}
                        <rect x="14" y="60" width="10" height="36" rx="4" fill="#182035" stroke="#2c395c" strokeWidth="1.5" />
                        <circle cx="19" cy="78" r="2.5" fill="#1864ff" opacity="0.8" />

                        <rect x="176" y="60" width="10" height="36" rx="4" fill="#182035" stroke="#2c395c" strokeWidth="1.5" />
                        <circle cx="181" cy="78" r="2.5" fill="#1864ff" opacity="0.8" />

                        {/* --- Main Helmet / Head Shell --- */}
                        <rect
                            x="24"
                            y="34"
                            width="152"
                            height="100"
                            rx="28"
                            fill="url(#headMetal)"
                            stroke="#2b3758"
                            strokeWidth="2"
                        />

                        {/* Subtle Head Panel Seams */}
                        <path d="M 46 34 L 56 46 L 144 46 L 154 34" fill="none" stroke="#2b3758" strokeWidth="1.2" opacity="0.6" />
                        <line x1="100" y1="34" x2="100" y2="46" stroke="#2b3758" strokeWidth="1.2" opacity="0.6" />

                        {/* --- Cyber Visor (Faceplate) --- */}
                        <rect
                            x="36"
                            y="53"
                            width="128"
                            height="52"
                            rx="18"
                            fill="url(#visorGlass)"
                            stroke="#1864ff"
                            strokeWidth="1.5"
                            strokeOpacity="0.4"
                        />

                        {/* Visor Glare / Specular highlight */}
                        <path
                            d="M 42 58 Q 100 52 158 58"
                            fill="none"
                            stroke="rgba(255,255,255,0.18)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />

                        {/* --- Eyes Layer (Clipped inside Visor) --- */}
                        <g clipPath={`url(#visorClip-${clipId})`}>
                            {/* Scanning Radar Line (when loading) */}
                            {isLoading && (
                                <line
                                    x1="38"
                                    y1="55"
                                    x2="38"
                                    y2="103"
                                    stroke="#38bdf8"
                                    strokeWidth="2"
                                    opacity="0.8"
                                >
                                    <animate
                                        attributeName="x1"
                                        values="38;162;38"
                                        dur="1.4s"
                                        repeatCount="indefinite"
                                    />
                                    <animate
                                        attributeName="x2"
                                        values="38;162;38"
                                        dur="1.4s"
                                        repeatCount="indefinite"
                                    />
                                </line>
                            )}

                            {/* Left Eye */}
                            <g 
                                className="transition-transform duration-100 ease-out"
                                style={{
                                    transform: `translate(${pupilOffsetX}px, ${pupilOffsetY}px)`,
                                    transformOrigin: '72px 79px',
                                }}
                            >
                                {isSuccess ? (
                                    /* Happy Arch Eye ^ */
                                    <path
                                        d="M 60 84 Q 72 70 84 84"
                                        fill="none"
                                        stroke={eyeColor}
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        style={{ filter: `drop-shadow(0 0 6px ${eyeGlow})` }}
                                    />
                                ) : hasError ? (
                                    /* X or Warning Eye */
                                    <g stroke={eyeColor} strokeWidth="3" strokeLinecap="round">
                                        <line x1="64" y1="73" x2="80" y2="85" />
                                        <line x1="80" y1="73" x2="64" y2="85" />
                                    </g>
                                ) : isBlinking ? (
                                    /* Blink slit */
                                    <line
                                        x1="62"
                                        y1="79"
                                        x2="82"
                                        y2="79"
                                        stroke={eyeColor}
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                    />
                                ) : (
                                    /* Normal / Tracking Eye */
                                    <>
                                        {/* Outer Eye Ring */}
                                        <circle
                                            cx="72"
                                            cy="79"
                                            r="13"
                                            fill="none"
                                            stroke={eyeColor}
                                            strokeWidth="2"
                                            opacity="0.3"
                                        />
                                        {/* Pupil Core */}
                                        <circle
                                            cx="72"
                                            cy="79"
                                            r="8"
                                            fill={eyeColor}
                                            style={{ filter: `drop-shadow(0 0 8px ${eyeGlow})` }}
                                        />
                                        {/* Pupil Catchlight */}
                                        <circle cx="70" cy="76" r="2.5" fill="#ffffff" opacity="0.9" />
                                    </>
                                )}
                            </g>

                            {/* Right Eye */}
                            <g 
                                className="transition-transform duration-100 ease-out"
                                style={{
                                    transform: `translate(${pupilOffsetX}px, ${pupilOffsetY}px)`,
                                    transformOrigin: '128px 79px',
                                }}
                            >
                                {isSuccess ? (
                                    /* Happy Arch Eye ^ */
                                    <path
                                        d="M 116 84 Q 128 70 140 84"
                                        fill="none"
                                        stroke={eyeColor}
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        style={{ filter: `drop-shadow(0 0 6px ${eyeGlow})` }}
                                    />
                                ) : hasError ? (
                                    /* X or Warning Eye */
                                    <g stroke={eyeColor} strokeWidth="3" strokeLinecap="round">
                                        <line x1="120" y1="73" x2="136" y2="85" />
                                        <line x1="136" y1="73" x2="120" y2="85" />
                                    </g>
                                ) : isBlinking && !isPeeking ? (
                                    /* Blink slit */
                                    <line
                                        x1="118"
                                        y1="79"
                                        x2="138"
                                        y2="79"
                                        stroke={eyeColor}
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                    />
                                ) : (
                                    /* Normal or Peeking Eye */
                                    <>
                                        <circle
                                            cx="128"
                                            cy="79"
                                            r="13"
                                            fill="none"
                                            stroke={eyeColor}
                                            strokeWidth="2"
                                            opacity="0.3"
                                        />
                                        <circle
                                            cx="128"
                                            cy="79"
                                            r="8"
                                            fill={eyeColor}
                                            style={{ filter: `drop-shadow(0 0 8px ${eyeGlow})` }}
                                        />
                                        <circle cx="126" cy="76" r="2.5" fill="#ffffff" opacity="0.9" />
                                    </>
                                )}
                            </g>
                        </g>

                        {/* --- Lower Mouth / Speaker Grille --- */}
                        <g opacity="0.6">
                            <line x1="84" y1="116" x2="116" y2="116" stroke="#253252" strokeWidth="2" strokeLinecap="round" />
                            <line x1="88" y1="121" x2="112" y2="121" stroke="#253252" strokeWidth="2" strokeLinecap="round" />
                        </g>

                        {/* --- Robot Neck / Collar --- */}
                        <rect x="74" y="134" width="52" height="12" rx="4" fill="#141a2e" stroke="#222b44" strokeWidth="1.5" />
                        <line x1="86" y1="134" x2="86" y2="146" stroke="#2b3758" strokeWidth="1" />
                        <line x1="100" y1="134" x2="100" y2="146" stroke="#2b3758" strokeWidth="1" />
                        <line x1="114" y1="134" x2="114" y2="146" stroke="#2b3758" strokeWidth="1" />
                    </svg>

                    {/* --- ARTICULATED MECHANICAL HANDS --- */}
                    {/* Left Mechanical Hand */}
                    <div
                        className="absolute bottom-1 left-2 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-20"
                        style={{
                            transform: leftHandTransform,
                            transformOrigin: 'bottom left',
                        }}
                    >
                        <svg width="56" height="56" viewBox="0 0 56 56">
                            {/* Arm joint */}
                            <rect x="6" y="24" width="16" height="26" rx="6" fill="url(#handMetal)" stroke="#37456c" strokeWidth="1.5" />
                            {/* Metallic Knuckles / Palm */}
                            <rect x="14" y="12" width="28" height="26" rx="8" fill="url(#handMetal)" stroke="#3f507c" strokeWidth="1.8" />
                            {/* Segmented Cyber Fingers */}
                            <rect x="16" y="3" width="6" height="12" rx="3" fill="#2d3958" stroke="#485b8c" strokeWidth="1" />
                            <rect x="24" y="1" width="6" height="14" rx="3" fill="#2d3958" stroke="#485b8c" strokeWidth="1" />
                            <rect x="32" y="3" width="6" height="12" rx="3" fill="#2d3958" stroke="#485b8c" strokeWidth="1" />
                            {/* Palm Circuit Accent */}
                            <circle cx="28" cy="24" r="3" fill="#1864ff" opacity="0.8" />
                        </svg>
                    </div>

                    {/* Right Mechanical Hand */}
                    <div
                        className="absolute bottom-1 right-2 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-20"
                        style={{
                            transform: rightHandTransform,
                            transformOrigin: 'bottom right',
                        }}
                    >
                        <svg width="56" height="56" viewBox="0 0 56 56">
                            {/* Arm joint */}
                            <rect x="34" y="24" width="16" height="26" rx="6" fill="url(#handMetal)" stroke="#37456c" strokeWidth="1.5" />
                            {/* Metallic Knuckles / Palm */}
                            <rect x="14" y="12" width="28" height="26" rx="8" fill="url(#handMetal)" stroke="#3f507c" strokeWidth="1.8" />
                            {/* Segmented Cyber Fingers */}
                            <rect x="18" y="3" width="6" height="12" rx="3" fill="#2d3958" stroke="#485b8c" strokeWidth="1" />
                            <rect x="26" y="1" width="6" height="14" rx="3" fill="#2d3958" stroke="#485b8c" strokeWidth="1" />
                            <rect x="34" y="3" width="6" height="12" rx="3" fill="#2d3958" stroke="#485b8c" strokeWidth="1" />
                            {/* Palm Circuit Accent */}
                            <circle cx="28" cy="24" r="3" fill="#1864ff" opacity="0.8" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}
