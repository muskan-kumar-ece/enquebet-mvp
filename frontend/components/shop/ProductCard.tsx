'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  VenopaiProduct,
  formatPriceINR,
  getVenopaiProductUrl,
} from '@/lib/venopaiCatalog';
import {
  ExternalLink,
  Plus,
  Check,
  Cpu,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface ProductCardProps {
  product: VenopaiProduct;
  onOpenSpecs: (product: VenopaiProduct) => void;
  onAddToBOM: (product: VenopaiProduct) => void;
  isInBOM?: boolean;
}

export function ProductCard({
  product,
  onOpenSpecs,
  onAddToBOM,
  isInBOM = false,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    onAddToBOM(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const discountPercent =
    product.compare_price_paise && product.compare_price_paise > product.price_paise
      ? Math.round(
          ((product.compare_price_paise - product.price_paise) /
            product.compare_price_paise) *
            100
        )
      : 0;

  const primaryImage = product.images?.[0] || '';
  const venopaiUrl = getVenopaiProductUrl(product.slug);

  return (
    <div className="group relative flex flex-col justify-between rounded-xl bg-surface-elevated/70 hover:bg-surface-elevated border border-border-default/80 hover:border-brand-primary/50 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md hover:shadow-black/20">
      {/* Top Banner / Image Area */}
      <div className="relative w-full aspect-[4/3] bg-surface-base/90 overflow-hidden border-b border-border-default/50">
        {primaryImage && !imageError ? (
          <img
            src={primaryImage}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-2 bg-gradient-to-b from-surface-base to-surface-elevated">
            <Cpu className="w-10 h-10 text-brand-light/40" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
              {product.sku}
            </span>
          </div>
        )}

        {/* Stock Status Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-base/85 backdrop-blur-md border border-border-default text-[10px] font-medium font-mono">
          {product.stock_quantity > 0 ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 font-semibold">
                {product.stock_quantity > 50 ? 'In Stock' : `${product.stock_quantity} Left`}
              </span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-amber-400">Backorder</span>
            </>
          )}
        </div>

        {/* Discount or Featured Pill */}
        {discountPercent > 0 ? (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-brand-primary/90 text-white text-[10px] font-bold font-mono shadow-sm">
            Save {discountPercent}%
          </div>
        ) : product.is_featured ? (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-semibold font-mono">
            Featured
          </div>
        ) : null}

        {/* Quick Specs Overlay Button */}
        <button
          onClick={() => onOpenSpecs(product)}
          type="button"
          className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-base/90 hover:bg-surface-base backdrop-blur-md border border-border-default text-[11px] font-medium text-text-secondary hover:text-text-primary transition-all opacity-0 group-hover:opacity-100"
          title="View Datasheet & Pinouts"
        >
          <Info className="w-3 h-3 text-brand-light" />
          <span>Quick Specs</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div className="space-y-1.5">
          {/* SKU Pill */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted truncate">
              SKU: {product.sku}
            </span>
            {product.weight_grams && (
              <span className="text-[10px] font-mono text-text-muted">
                {product.weight_grams}g
              </span>
            )}
          </div>

          {/* Product Name */}
          <h3
            onClick={() => onOpenSpecs(product)}
            className="text-sm font-semibold text-text-primary group-hover:text-brand-light transition-colors line-clamp-1 cursor-pointer"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Short Description */}
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* Key Specs Pills */}
          {product.specifications && product.specifications.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-1.5">
              {product.specifications.slice(0, 2).map((spec, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-base border border-border-default/60 text-[10px] text-text-muted font-mono"
                >
                  <span className="text-text-secondary font-medium">{spec.key}:</span>
                  <span className="truncate max-w-[110px]">{spec.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing & Footer Actions */}
        <div className="pt-3 border-t border-border-default/60 space-y-2.5">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-text-primary font-mono tracking-tight">
                {formatPriceINR(product.price_paise)}
              </span>
              {product.compare_price_paise &&
                product.compare_price_paise > product.price_paise && (
                  <span className="text-xs text-text-muted line-through font-mono">
                    {formatPriceINR(product.compare_price_paise)}
                  </span>
                )}
            </div>

            <span className="text-[10px] text-text-muted font-mono">GST Incl.</span>
          </div>

          {/* Action Button Row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Primary Action: Order via VenopAI Punchout */}
            <a
              href={venopaiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold shadow-sm transition-all text-center group/btn"
              title="Punchout to order directly on venopai.in"
            >
              <span>Order on VenopAI</span>
              <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
            </a>

            {/* Secondary Action: Add to Project BOM */}
            <button
              onClick={handleAdd}
              type="button"
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                justAdded || isInBOM
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-surface-base hover:bg-surface-base/80 border-border-default text-text-secondary hover:text-text-primary'
              }`}
              title="Add this component to your Project Bill of Materials"
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50" />
                  <span>Added!</span>
                </>
              ) : isInBOM ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>In BOM</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-brand-light" />
                  <span>Add to BOM</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
