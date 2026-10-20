"use client";

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface PostMediaGalleryProps {
    images: string[];
    altTitle?: string;
    className?: string;
}

export default function PostMediaGallery({
    images,
    altTitle = "Post attachment",
    className = "",
}: PostMediaGalleryProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    // Keyboard navigation for lightbox
    useEffect(() => {
        if (lightboxIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setLightboxIndex(null);
            } else if (e.key === 'ArrowRight') {
                setLightboxIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'ArrowLeft') {
                setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, images.length]);

    if (!images || images.length === 0) return null;

    const count = images.length;

    const openLightbox = (index: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setLightboxIndex(index);
    };

    return (
        <>
            <div className={`mt-2 mb-4 rounded-xl overflow-hidden border border-[#252533] bg-[#0d1017] ${className}`}>
                {count === 1 && (
                    <div
                        onClick={(e) => openLightbox(0, e)}
                        className="relative group cursor-pointer max-h-[500px] overflow-hidden flex items-center justify-center bg-black/40"
                    >
                        <img
                            src={images[0]}
                            alt={`${altTitle} 1`}
                            className="w-full h-auto max-h-[500px] object-cover group-hover:scale-[1.01] transition-transform duration-300"
                            loading="lazy"
                        />
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                            <Maximize2 className="w-4 h-4" />
                        </div>
                    </div>
                )}

                {count === 2 && (
                    <div className="grid grid-cols-2 gap-1.5 aspect-[16/9]">
                        {images.map((img, idx) => (
                            <div
                                key={idx}
                                onClick={(e) => openLightbox(idx, e)}
                                className="relative group cursor-pointer overflow-hidden bg-black/30 h-full"
                            >
                                <img
                                    src={img}
                                    alt={`${altTitle} ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {count === 3 && (
                    <div className="grid grid-cols-2 gap-1.5 aspect-[16/9]">
                        <div
                            onClick={(e) => openLightbox(0, e)}
                            className="relative group cursor-pointer overflow-hidden bg-black/30 h-full"
                        >
                            <img
                                src={images[0]}
                                alt={`${altTitle} 1`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                            />
                        </div>
                        <div className="grid grid-rows-2 gap-1.5 h-full">
                            {images.slice(1, 3).map((img, idx) => (
                                <div
                                    key={idx + 1}
                                    onClick={(e) => openLightbox(idx + 1, e)}
                                    className="relative group cursor-pointer overflow-hidden bg-black/30 h-full"
                                >
                                    <img
                                        src={img}
                                        alt={`${altTitle} ${idx + 2}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {count >= 4 && (
                    <div className="grid grid-cols-2 grid-rows-2 gap-1.5 aspect-[16/9]">
                        {images.slice(0, 4).map((img, idx) => {
                            const isFourth = idx === 3;
                            const remaining = count - 4;

                            return (
                                <div
                                    key={idx}
                                    onClick={(e) => openLightbox(idx, e)}
                                    className="relative group cursor-pointer overflow-hidden bg-black/30 h-full"
                                >
                                    <img
                                        src={img}
                                        alt={`${altTitle} ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                    {isFourth && remaining > 0 && (
                                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center font-bold text-lg md:text-xl text-white backdrop-blur-[2px]">
                                            +{remaining}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {lightboxIndex !== null && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLightboxIndex(null);
                    }}
                >
                    <div
                        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => setLightboxIndex(null)}
                            className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                            aria-label="Close image preview"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Image Counter */}
                        <div className="absolute -top-10 left-0 text-xs font-medium text-zinc-300">
                            {lightboxIndex + 1} / {images.length}
                        </div>

                        {/* Main Image */}
                        <img
                            src={images[lightboxIndex]}
                            alt={`${altTitle} preview`}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                        />

                        {/* Navigation Arrows */}
                        {images.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
                                    }}
                                    className="absolute left-[-48px] top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/10 text-white transition-all hover:scale-105 hidden sm:flex items-center justify-center"
                                    aria-label="Previous image"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
                                    }}
                                    className="absolute right-[-48px] top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/10 text-white transition-all hover:scale-105 hidden sm:flex items-center justify-center"
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
