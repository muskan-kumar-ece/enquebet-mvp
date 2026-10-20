"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Heart } from 'lucide-react';
import { api } from '@/lib/api';

interface PostMediaGalleryProps {
    images: string[];
    altTitle?: string;
    className?: string;
    postId?: string;
    onDoubleTapLike?: () => void;
}

export default function PostMediaGallery({
    images,
    altTitle = "Post attachment",
    className = "",
    postId,
    onDoubleTapLike,
}: PostMediaGalleryProps) {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [showHeart, setShowHeart] = useState<boolean>(false);

    const carouselRef = useRef<HTMLDivElement>(null);
    const lastTapRef = useRef<number>(0);
    const heartTimerRef = useRef<NodeJS.Timeout | null>(null);

    const count = images ? images.length : 0;

    // Track scroll position to update active index
    const handleScroll = useCallback(() => {
        if (!carouselRef.current) return;
        const { scrollLeft, clientWidth } = carouselRef.current;
        if (clientWidth > 0) {
            const index = Math.round(scrollLeft / clientWidth);
            if (index >= 0 && index < count && index !== currentIndex) {
                setCurrentIndex(index);
            }
        }
    }, [count, currentIndex]);

    // Scroll to specific slide
    const scrollToIndex = (index: number) => {
        if (!carouselRef.current) return;
        const targetIndex = Math.max(0, Math.min(index, count - 1));
        const clientWidth = carouselRef.current.clientWidth;
        carouselRef.current.scrollTo({
            left: targetIndex * clientWidth,
            behavior: 'smooth',
        });
        setCurrentIndex(targetIndex);
    };

    // Double-tap liking gesture
    const handleTapOrClick = (e: React.MouseEvent | React.TouchEvent) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap detected
            e.preventDefault();
            setShowHeart(true);
            if (heartTimerRef.current) clearTimeout(heartTimerRef.current);
            heartTimerRef.current = setTimeout(() => setShowHeart(false), 900);

            if (onDoubleTapLike) {
                onDoubleTapLike();
            } else if (postId) {
                api.ensureLiked(postId).catch(() => {});
            }
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
        }
    };

    // Keyboard navigation for carousel when in focus
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (count <= 1) return;
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollToIndex(currentIndex + 1);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollToIndex(currentIndex - 1);
        }
    };

    // Lightbox keyboard controls
    useEffect(() => {
        if (lightboxIndex === null) return;

        const handleLightboxKeys = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setLightboxIndex(null);
            } else if (e.key === 'ArrowRight') {
                setLightboxIndex((prev) => (prev !== null && prev < count - 1 ? prev + 1 : 0));
            } else if (e.key === 'ArrowLeft') {
                setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : count - 1));
            }
        };

        window.addEventListener('keydown', handleLightboxKeys);
        return () => window.removeEventListener('keydown', handleLightboxKeys);
    }, [lightboxIndex, count]);

    if (!images || count === 0) return null;

    return (
        <>
            <div 
                className={`relative group/gallery mt-2 mb-4 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md ${className}`}
                role="region"
                aria-roledescription="carousel"
                aria-label="Post media carousel"
                tabIndex={0}
                onKeyDown={handleKeyDown}
            >
                {/* 1/N Badge */}
                {count > 1 && (
                    <div className="absolute top-3 right-3 z-30 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-white tracking-wide shadow-lg pointer-events-none">
                        {currentIndex + 1} / {count}
                    </div>
                )}

                {/* Lightbox / Expand Button */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLightboxIndex(currentIndex);
                    }}
                    className="absolute top-3 left-3 z-30 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Expand image"
                    title="View fullscreen"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>

                {/* Double-tap burst heart animation */}
                {showHeart && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                        <div className="animate-in zoom-in-50 fade-in duration-200 fill-mode-forwards text-rose-500 drop-shadow-[0_0_25px_rgba(244,63,94,0.7)]">
                            <Heart className="w-24 h-24 fill-rose-500 stroke-white stroke-[1.5]" />
                        </div>
                    </div>
                )}

                {/* Swipeable Carousel Track */}
                <div
                    ref={carouselRef}
                    onScroll={handleScroll}
                    onClick={handleTapOrClick}
                    className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none touch-pan-x cursor-pointer select-none"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {images.map((img, idx) => (
                        <div
                            key={idx}
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`Slide ${idx + 1} of ${count}`}
                            className="relative min-w-full w-full aspect-[4/3] sm:aspect-[16/10] max-h-[460px] md:max-h-[520px] snap-start shrink-0 flex items-center justify-center overflow-hidden bg-slate-950"
                        >
                            {/* Blurred Backdrop Layer (Ensures no blank gaps and beautiful atmospheric fill) */}
                            <img
                                src={img}
                                alt=""
                                aria-hidden="true"
                                className="absolute inset-0 w-full h-full object-cover filter blur-xl scale-110 opacity-30 pointer-events-none select-none"
                                loading={idx === 0 ? "eager" : "lazy"}
                            />

                            {/* Sharp Foreground Image (Aspect-preserved object-contain so flyers/text are NEVER cropped) */}
                            <img
                                src={img}
                                alt={`${altTitle} - ${idx + 1} of ${count}`}
                                className="relative z-10 max-h-full max-w-full object-contain pointer-events-none select-none transition-transform duration-300"
                                loading={idx === 0 ? "eager" : "lazy"}
                            />
                        </div>
                    ))}
                </div>

                {/* Desktop Navigation Arrows (hidden on touch, visible on desktop hover/focus) */}
                {count > 1 && (
                    <>
                        {currentIndex > 0 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    scrollToIndex(currentIndex - 1);
                                }}
                                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all opacity-0 group-hover/gallery:opacity-100 shadow-xl focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Previous photo"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        {currentIndex < count - 1 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    scrollToIndex(currentIndex + 1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all opacity-0 group-hover/gallery:opacity-100 shadow-xl focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Next photo"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}
                    </>
                )}

                {/* Animated Pagination Dots */}
                {count > 1 && (
                    <div className="absolute bottom-3 inset-x-0 z-30 flex items-center justify-center gap-1.5 pointer-events-none">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 pointer-events-auto">
                            {images.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        scrollToIndex(idx);
                                    }}
                                    className={`transition-all duration-200 rounded-full focus:outline-none ${
                                        currentIndex === idx
                                            ? 'w-4 h-1.5 bg-blue-500 shadow-sm shadow-blue-500/50'
                                            : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                                    }`}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {lightboxIndex !== null && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLightboxIndex(null);
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Image preview"
                >
                    <div
                        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header bar in lightbox */}
                        <div className="absolute -top-12 inset-x-0 flex items-center justify-between text-white px-2">
                            <span className="text-xs font-semibold text-slate-300">
                                {lightboxIndex + 1} / {count}
                            </span>
                            <button
                                type="button"
                                onClick={() => setLightboxIndex(null)}
                                className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Close image preview"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Main Lightbox Image */}
                        <div className="relative max-w-full max-h-[82vh] flex items-center justify-center overflow-hidden rounded-xl shadow-2xl bg-black/60">
                            <img
                                src={images[lightboxIndex]}
                                alt={`${altTitle} preview ${lightboxIndex + 1}`}
                                className="max-w-full max-h-[82vh] object-contain rounded-xl"
                            />
                        </div>

                        {/* Lightbox Nav Arrows */}
                        {count > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : count - 1));
                                    }}
                                    className="absolute left-2 sm:-left-12 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-white flex items-center justify-center transition-all hover:scale-105 shadow-xl"
                                    aria-label="Previous image"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxIndex((prev) => (prev !== null && prev < count - 1 ? prev + 1 : 0));
                                    }}
                                    className="absolute right-2 sm:-right-12 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-white flex items-center justify-center transition-all hover:scale-105 shadow-xl"
                                    aria-label="Next image"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
