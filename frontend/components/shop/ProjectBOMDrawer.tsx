'use client';

import React, { useState } from 'react';
import {
  BOMItem,
  formatPriceINR,
  getVenopaiProductUrl,
} from '@/lib/venopaiCatalog';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Copy,
  Check,
  Download,
  ShoppingBag,
  ExternalLink,
  Cpu,
} from 'lucide-react';

interface ProjectBOMDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: BOMItem[];
  onUpdateQuantity: (sku: string, quantity: number) => void;
  onRemoveItem: (sku: string) => void;
  onClearBOM: () => void;
}

export function ProjectBOMDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearBOM,
}: ProjectBOMDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalPaise = items.reduce(
    (sum, item) => sum + item.product.price_paise * item.quantity,
    0
  );

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  // Generate Markdown BOM Table for Workspace task deliverables
  const handleCopyMarkdown = () => {
    let md = `### 🛠️ Hardware Bill of Materials (BOM)\n`;
    md += `*Generated via ENQUEbet Hardware Hub (Powered by VenopAI)*\n\n`;
    md += `| Component | SKU | Qty | Unit Price | Total | Procurement Link |\n`;
    md += `| :--- | :--- | :---: | :---: | :---: | :--- |\n`;

    items.forEach((item) => {
      const unit = formatPriceINR(item.product.price_paise);
      const subtotal = formatPriceINR(item.product.price_paise * item.quantity);
      const url = getVenopaiProductUrl(item.product.slug);
      md += `| **${item.product.name}** | \`${item.product.sku}\` | ${item.quantity} | ${unit} | ${subtotal} | [Order on VenopAI](${url}) |\n`;
    });

    md += `\n**Total Estimated Hardware Budget:** \`${formatPriceINR(totalPaise)}\` (${totalUnits} parts)\n`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'Product Name,SKU,Quantity,Unit Price (INR),Total Price (INR),VenopAI URL\n';
    items.forEach((item) => {
      const unit = Math.round(item.product.price_paise / 100);
      const sub = Math.round((item.product.price_paise * item.quantity) / 100);
      const url = getVenopaiProductUrl(item.product.slug);
      csv += `"${item.product.name}","${item.product.sku}",${item.quantity},${unit},${sub},"${url}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `enquebet-project-bom-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md sm:max-w-lg h-full bg-surface-base border-l border-border-default shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-border-default/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-surface-elevated border border-border-default">
              <ShoppingBag className="w-4 h-4 text-brand-light" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Project Bill of Materials</h2>
              <p className="text-xs text-text-muted">
                {items.length} unique components ({totalUnits} total units)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary bg-surface-elevated hover:bg-surface-elevated/80 border border-border-default transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body: Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-border-default flex items-center justify-center text-text-muted">
                <Cpu className="w-6 h-6 text-brand-light/40" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-text-primary">BOM is empty</h3>
                <p className="text-xs text-text-muted max-w-xs leading-relaxed">
                  Browse microcontrollers, sensors, and power modules from the catalog and click &quot;Add to BOM&quot; to build your hardware requisition.
                </p>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.sku}
                className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-surface-elevated/70 border border-border-default/80"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    SKU: {item.product.sku}
                  </div>
                  <h4 className="text-xs font-semibold text-text-primary truncate">
                    {item.product.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                    <span>{formatPriceINR(item.product.price_paise)} each</span>
                    <span className="text-border-default">|</span>
                    <span className="text-text-primary font-bold">
                      {formatPriceINR(item.product.price_paise * item.quantity)}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls & Remove */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="inline-flex items-center rounded-lg bg-surface-base border border-border-default p-0.5">
                    <button
                      onClick={() => onUpdateQuantity(item.product.sku, item.quantity - 1)}
                      type="button"
                      className="p-1 text-text-muted hover:text-text-primary"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-bold text-text-primary">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.product.sku, item.quantity + 1)}
                      type="button"
                      className="p-1 text-text-muted hover:text-text-primary"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.product.sku)}
                    type="button"
                    className="p-1.5 text-text-muted hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer: Actions */}
        {items.length > 0 && (
          <div className="p-5 border-t border-border-default/80 space-y-4 bg-surface-base/90">
            {/* Total Budget Summary */}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-text-muted">Total Hardware Estimate</span>
                <div className="text-lg font-bold font-mono text-text-primary">
                  {formatPriceINR(totalPaise)}
                </div>
              </div>
              <button
                onClick={onClearBOM}
                type="button"
                className="text-xs text-text-muted hover:text-rose-400 transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Export & Copy Row */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyMarkdown}
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated hover:bg-surface-elevated/80 border border-border-default text-xs font-medium text-text-primary transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-brand-light" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExportCSV}
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated hover:bg-surface-elevated/80 border border-border-default text-xs font-medium text-text-primary transition-all"
              >
                <Download className="w-3.5 h-3.5 text-brand-light" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Direct Order on VenopAI */}
            <a
              href="https://venopai.in/cart?ref=enquebet"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold shadow-sm transition-all text-center"
            >
              <span>Order Components on VenopAI.in</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <p className="text-[11px] text-center text-text-muted leading-tight">
              Paste copied Markdown into your Workspace Task deliverables or team grant request.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
