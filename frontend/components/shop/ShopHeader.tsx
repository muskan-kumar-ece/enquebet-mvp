'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { Search, ShoppingBag, Cpu, ShieldCheck, Truck, Sparkles, ExternalLink } from 'lucide-react';

interface ShopHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalProducts: number;
  bomCount: number;
  onOpenBOM: () => void;
  onViewServices: () => void;
  isLive?: boolean;
  isLoading?: boolean;
}

export function ShopHeader({
  searchQuery,
  onSearchChange,
  totalProducts,
  bomCount,
  onOpenBOM,
  onViewServices,
  isLive = false,
  isLoading = false,
}: ShopHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="relative w-full border-b border-border-default/80 bg-surface-base/80 backdrop-blur-md pt-8 pb-7 px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="max-w-[1520px] mx-auto space-y-6">
        {/* Top Partner Verified Pill & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated/90 border border-border-default/90 text-xs shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-text-muted font-mono uppercase tracking-wider text-[11px]">Official Partner:</span>
              <a
                href="https://venopai.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-text-primary font-semibold hover:text-brand-light transition-colors group"
              >
                <span className="tracking-tight">VenopAI</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-primary/15 text-brand-light font-mono font-medium border border-brand-primary/25">
                  venopai.in
                </span>
                <ExternalLink className="w-3 h-3 text-text-muted group-hover:text-brand-light transition-colors" />
              </a>
            </div>

            {/* Live Partner Sync Status Badge */}
            {isLive ? (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-400"
                title="Synchronized in real-time with VenopAI verified inventory"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Inventory Sync</span>
              </div>
            ) : isLoading ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-elevated border border-border-default text-[11px] font-mono text-brand-light">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-light animate-ping" />
                <span>Syncing Catalog...</span>
              </div>
            ) : (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-elevated/70 border border-border-default text-[11px] font-mono text-text-muted"
                title="Verified hardware components"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                <span>Verified Catalog</span>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onViewServices}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-elevated hover:bg-surface-elevated/80 border border-border-default transition-all"
            >
              <Cpu className="w-3.5 h-3.5 text-brand-light" />
              <span>PCB & Prototyping Services</span>
            </button>

            <button
              onClick={onOpenBOM}
              type="button"
              className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-text-primary bg-surface-elevated hover:bg-surface-elevated/80 border border-border-default hover:border-brand-primary/50 transition-all shadow-sm"
              title="View Workspace Bill of Materials"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-brand-light" />
              <span>Project BOM</span>
              {bomCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-bold bg-brand-primary text-white">
                  {bomCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hero Headline & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Builder Hardware & Component Hub
            </h1>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              From software Proof of Work to silicon reality. Source verified microcontrollers, sensor suites, and
              industrial components with direct procurement and rapid engineering fabrication.
            </p>
          </div>

          {/* Search Box with Keycap Hint */}
          <div className="w-full md:w-80 lg:w-96 relative">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search STM32, ESP32, LiDAR, sensors..."
                className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-surface-elevated/90 border border-border-default/90 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all font-sans"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-muted bg-surface-base px-1.5 py-0.5 rounded border border-border-default pointer-events-none">
                /
              </kbd>
            </div>
          </div>
        </div>

        {/* Tactical Trust Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-elevated/40 border border-border-default/60">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-text-primary truncate">100% Verified Specs</div>
              <div className="text-[11px] text-text-muted truncate">Lab-tested silicon & pinouts</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-elevated/40 border border-border-default/60">
            <Truck className="w-4 h-4 text-brand-light shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-text-primary truncate">Express Dispatch</div>
              <div className="text-[11px] text-text-muted truncate">All-India delivery via Shiprocket</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-elevated/40 border border-border-default/60">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-text-primary truncate">Rapid PCB & Prototyping</div>
              <div className="text-[11px] text-text-muted truncate">24-48h fabrication turnaround</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-elevated/40 border border-border-default/60">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-text-primary truncate">Workspace BOM Export</div>
              <div className="text-[11px] text-text-muted truncate">Direct sync to project tasks</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
