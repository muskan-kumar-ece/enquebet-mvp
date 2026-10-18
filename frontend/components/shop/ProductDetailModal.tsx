'use client';

import React, { useState } from 'react';
import {
  VenopaiProduct,
  formatPriceINR,
  getVenopaiProductUrl,
} from '@/lib/venopaiCatalog';
import {
  X,
  ExternalLink,
  Cpu,
  ShieldCheck,
  Truck,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: VenopaiProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToBOM: (product: VenopaiProduct, quantity: number) => void;
  isInBOM?: boolean;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToBOM,
  isInBOM = false,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  if (!isOpen || !product) return null;

  const venopaiUrl = getVenopaiProductUrl(product.slug);
  const images = product.images && product.images.length > 0 ? product.images : [];
  const currentImage = images[selectedImageIdx] || images[0] || '';

  const handleAdd = () => {
    onAddToBOM(product, quantity);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-base border border-border-default/90 shadow-2xl p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 rounded-xl text-text-muted hover:text-text-primary bg-surface-elevated hover:bg-surface-elevated/80 border border-border-default transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row items-start gap-6 border-b border-border-default/80 pb-6">
          {/* Product Image Column */}
          <div className="w-full sm:w-64 space-y-3 shrink-0">
            <div className="relative w-full aspect-square rounded-xl bg-surface-elevated border border-border-default overflow-hidden flex items-center justify-center">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Cpu className="w-16 h-16 text-brand-light/40" />
              )}

              {discountPercent > 0 && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-brand-primary text-white text-[10px] font-mono font-bold">
                  -{discountPercent}%
                </div>
              )}
            </div>

            {/* Thumbnail switcher if multiple images exist */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIdx(i)}
                    className={`w-12 h-12 rounded-lg border overflow-hidden shrink-0 transition-all ${
                      selectedImageIdx === i
                        ? 'border-brand-primary ring-1 ring-brand-primary'
                        : 'border-border-default opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Core Info Column */}
          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border-default text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  SKU: {product.sku}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold">
                  {product.stock_quantity > 0 ? `${product.stock_quantity} In Stock` : 'Backorder'}
                </span>
                {product.weight_grams && (
                  <span className="text-[10px] font-mono text-text-muted">
                    {product.weight_grams} grams
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                {product.name}
              </h2>
            </div>

            {/* Price section */}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold font-mono text-text-primary">
                {formatPriceINR(product.price_paise)}
              </span>
              {product.compare_price_paise &&
                product.compare_price_paise > product.price_paise && (
                  <span className="text-sm font-mono text-text-muted line-through">
                    {formatPriceINR(product.compare_price_paise)}
                  </span>
                )}
              <span className="text-xs font-mono text-text-muted">GST included</span>
            </div>

            {/* Product description */}
            <p className="text-sm text-text-secondary leading-relaxed">
              {product.description}
            </p>

            {/* Procurement / Action Row */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {/* Quantity selector */}
              <div className="inline-flex items-center rounded-lg bg-surface-elevated border border-border-default p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-base"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-mono font-bold text-text-primary">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-base"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to BOM */}
              <button
                onClick={handleAdd}
                type="button"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                  justAdded
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-surface-elevated hover:bg-surface-elevated/80 border-border-default text-text-primary hover:border-brand-primary/50'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Added {quantity} to BOM!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-brand-light" />
                    <span>Add to Project BOM</span>
                  </>
                )}
              </button>

              {/* Direct Punchout to VenopAI */}
              <a
                href={venopaiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <span>Order on VenopAI.in</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Technical Specifications Datasheet */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-light" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
              Engineering Datasheet & Specifications
            </h3>
          </div>

          <div className="rounded-xl border border-border-default/80 bg-surface-elevated/50 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-default/60">
              <div className="divide-y divide-border-default/60">
                {product.specifications.slice(0, Math.ceil(product.specifications.length / 2)).map((spec, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-xs">
                    <span className="font-medium text-text-secondary">{spec.key}</span>
                    <span className="font-mono text-text-primary font-semibold">{spec.value}</span>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-border-default/60">
                {product.specifications.slice(Math.ceil(product.specifications.length / 2)).map((spec, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-xs">
                    <span className="font-medium text-text-secondary">{spec.key}</span>
                    <span className="font-mono text-text-primary font-semibold">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fulfillment & Quality Assurance Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-default/60 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Sourced & validated by VenopAI Lab Engineers</span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-brand-light shrink-0" />
            <span>Dispatched via Shiprocket with real-time tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
}
