'use client';

import React from 'react';
import { CANONICAL_SERVICES, getVenopaiServiceUrl } from '@/lib/venopaiCatalog';
import {
  Cpu,
  Box,
  Layers,
  Code2,
  ExternalLink,
  Clock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface ServicesGridProps {
  id?: string;
}

export function ServicesGrid({ id = 'services-section' }: ServicesGridProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-brand-light" />;
      case 'Box':
        return <Box className="w-5 h-5 text-cyan-400" />;
      case 'Layers':
        return <Layers className="w-5 h-5 text-amber-400" />;
      case 'Code2':
        return <Code2 className="w-5 h-5 text-emerald-400" />;
      default:
        return <Cpu className="w-5 h-5 text-brand-light" />;
    }
  };

  return (
    <section id={id} className="w-full space-y-6 pt-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-default/80 pb-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-[11px] font-mono text-brand-light">
            <Sparkles className="w-3 h-3" />
            <span>On-Demand Prototyping Services</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Custom Hardware Fabrication & Engineering
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Need custom PCBs, precision 3D enclosures, or embedded firmware consulting? Submit Gerber, CAD, or specs directly to the VenopAI engineering team.
          </p>
        </div>

        <a
          href="https://venopai.in/services/manufacturing?ref=enquebet"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-light hover:underline self-start sm:self-auto"
        >
          <span>View All VenopAI Services</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 4-Card Tactile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CANONICAL_SERVICES.map((srv) => {
          const directUrl = getVenopaiServiceUrl(srv.slug);

          return (
            <div
              key={srv.id}
              className="flex flex-col justify-between rounded-xl bg-surface-elevated/80 border border-border-default/80 hover:border-brand-primary/50 transition-all p-5 space-y-4 group hover:shadow-md hover:shadow-black/20"
            >
              <div className="space-y-3">
                {/* Icon & Turnaround Pill */}
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-surface-base border border-border-default group-hover:border-brand-primary/40 transition-colors">
                    {getIcon(srv.icon)}
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-base border border-border-default/80 text-[10px] font-mono text-text-muted">
                    <Clock className="w-3 h-3 text-text-muted" />
                    <span>{srv.turnaround}</span>
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h3 className="text-base font-bold text-text-primary group-hover:text-brand-light transition-colors">
                    {srv.title}
                  </h3>
                  <p className="text-xs font-mono text-text-muted mt-0.5">
                    {srv.subtitle}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-text-secondary leading-relaxed">
                  {srv.description}
                </p>

                {/* Bullet Features */}
                <ul className="space-y-1.5 pt-2 border-t border-border-default/60">
                  {srv.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[11px] text-text-secondary">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <a
                  href={directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-base hover:bg-brand-primary text-text-primary hover:text-white border border-border-default hover:border-brand-primary text-xs font-semibold transition-all group/btn"
                >
                  <span>Launch Quote Request</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
