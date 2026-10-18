'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CANONICAL_CATEGORIES,
  CANONICAL_PRODUCTS,
  VenopaiProduct,
  BOMItem,
  fetchVenopaiCatalog,
} from '@/lib/venopaiCatalog';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { CategoryTabs } from '@/components/shop/CategoryTabs';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductDetailModal } from '@/components/shop/ProductDetailModal';
import { ServicesGrid } from '@/components/shop/ServicesGrid';
import { ProjectBOMDrawer } from '@/components/shop/ProjectBOMDrawer';
import { Cpu, Search, ExternalLink, ShieldCheck } from 'lucide-react';

const BOM_STORAGE_KEY = 'enquebet_project_bom';

export default function ShopPage() {
  const [products, setProducts] = useState<VenopaiProduct[]>(CANONICAL_PRODUCTS);
  const [categories, setCategories] = useState(CANONICAL_CATEGORIES);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  // Modal & Drawer State
  const [selectedProduct, setSelectedProduct] = useState<VenopaiProduct | null>(null);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [isBOMOpen, setIsBOMOpen] = useState(false);

  // BOM items persisted in localStorage
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);

  // Load BOM from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BOM_STORAGE_KEY);
      if (saved) {
        setBomItems(JSON.parse(saved));
      }
    } catch {
      // ignore storage error
    }
  }, []);

  // Sync BOM to localStorage
  const saveBOM = (newItems: BOMItem[]) => {
    setBomItems(newItems);
    try {
      localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(newItems));
    } catch {
      // ignore storage error
    }
  };

  // Check for live VenopAI backend updates on mount
  useEffect(() => {
    setIsLoading(true);
    fetchVenopaiCatalog()
      .then((res) => {
        if (res.products.length > 0) {
          setProducts(res.products);
          setCategories(res.categories);
        }
        setIsLive(res.isLive);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // BOM Handlers
  const handleAddToBOM = (product: VenopaiProduct, qty: number = 1) => {
    const existingIndex = bomItems.findIndex((i) => i.product.sku === product.sku);
    if (existingIndex > -1) {
      const updated = [...bomItems];
      updated[existingIndex].quantity += qty;
      saveBOM(updated);
    } else {
      saveBOM([...bomItems, { product, quantity: qty }]);
    }
  };

  const handleUpdateBOMQuantity = (sku: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveBOMItem(sku);
      return;
    }
    const updated = bomItems.map((item) =>
      item.product.sku === sku ? { ...item, quantity: qty } : item
    );
    saveBOM(updated);
  };

  const handleRemoveBOMItem = (sku: string) => {
    saveBOM(bomItems.filter((i) => i.product.sku !== sku));
  };

  const handleClearBOM = () => {
    saveBOM([]);
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category_slug] = (counts[p.category_slug] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (activeCategory !== 'all' && p.category_slug !== activeCategory) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchSku = p.sku.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchSpecs = p.specifications?.some(
            (s) =>
              s.key.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
          );
          if (!matchName && !matchSku && !matchDesc && !matchSpecs) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'featured') {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return 0;
        }
        if (sortBy === 'price-asc') return a.price_paise - b.price_paise;
        if (sortBy === 'price-desc') return b.price_paise - a.price_paise;
        if (sortBy === 'stock') return b.stock_quantity - a.stock_quantity;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [products, activeCategory, searchQuery, sortBy]);

  const bomSkus = useMemo(() => new Set(bomItems.map((i) => i.product.sku)), [bomItems]);

  const scrollToServices = () => {
    document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-blueprint-grid text-text-primary pb-20">
      {/* Header & Search */}
      <ShopHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalProducts={products.length}
        bomCount={bomItems.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenBOM={() => setIsBOMOpen(true)}
        onViewServices={scrollToServices}
        isLive={isLive}
        isLoading={isLoading}
      />

      {/* Main Body */}
      <main className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-8 space-y-8">
        {/* Category Selector & Sort */}
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          categoryCounts={categoryCounts}
          totalCount={products.length}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Product Count & Active Filter Indicator */}
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Showing <strong className="text-text-primary font-mono">{filteredProducts.length}</strong> of{' '}
            <span className="font-mono">{products.length}</span> verified components
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-brand-light hover:underline font-medium"
            >
              Clear search &quot;{searchQuery}&quot;
            </button>
          )}
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.sku}
                product={product}
                isInBOM={bomSkus.has(product.sku)}
                onOpenSpecs={(p) => {
                  setSelectedProduct(p);
                  setIsSpecsOpen(true);
                }}
                onAddToBOM={(p) => handleAddToBOM(p, 1)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border-default/80 bg-surface-elevated/40 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-surface-base border border-border-default flex items-center justify-center mx-auto text-text-muted">
              <Search className="w-6 h-6 text-brand-light/50" />
            </div>
            <h3 className="text-base font-bold text-text-primary">No components found</h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              No hardware matched your search criteria &quot;{searchQuery}&quot;. Try searching for microcontrollers, sensors, or power regulators.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              type="button"
              className="px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface-elevated/80 border border-border-default text-xs font-medium text-text-primary transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Rapid Fabrication & Engineering Services Section */}
        <ServicesGrid id="services-section" />

        {/* Footer Attribution Banner */}
        <footer className="pt-10 border-t border-border-default/70 mt-12">
          <div className="rounded-xl p-6 bg-surface-elevated/60 border border-border-default/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-text-primary">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>VenopAI Verified Hardware Ecosystem</span>
              </div>
              <p className="text-xs text-text-secondary max-w-xl">
                All components, development boards, and rapid fabrication services are fulfilled by VenopAI
                (venopai.in) with standard warranty, technical datasheets, and Indian regulatory compliance.
              </p>
            </div>

            <a
              href="https://venopai.in?ref=enquebet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-base hover:bg-surface-base/80 border border-border-default text-xs font-semibold text-text-primary transition-all shrink-0"
            >
              <span>Visit venopai.in</span>
              <ExternalLink className="w-3.5 h-3.5 text-brand-light" />
            </a>
          </div>
        </footer>
      </main>

      {/* Product Detail Datasheet Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isSpecsOpen}
        onClose={() => {
          setIsSpecsOpen(false);
          setSelectedProduct(null);
        }}
        isInBOM={selectedProduct ? bomSkus.has(selectedProduct.sku) : false}
        onAddToBOM={(product, qty) => handleAddToBOM(product, qty)}
      />

      {/* Slide-over Project BOM Drawer */}
      <ProjectBOMDrawer
        isOpen={isBOMOpen}
        onClose={() => setIsBOMOpen(false)}
        items={bomItems}
        onUpdateQuantity={handleUpdateBOMQuantity}
        onRemoveItem={handleRemoveBOMItem}
        onClearBOM={handleClearBOM}
      />
    </div>
  );
}
