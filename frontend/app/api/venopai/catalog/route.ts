import { NextResponse } from 'next/server';
import {
  CANONICAL_CATEGORIES,
  CANONICAL_PRODUCTS,
  VenopaiProduct,
  VenopaiCategory,
} from '@/lib/venopaiCatalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Server-side only private backend URL (never exposed to client bundle or git)
  const backendUrl = process.env.VENOPAI_BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json({
      categories: CANONICAL_CATEGORIES,
      products: CANONICAL_PRODUCTS,
      isLive: false,
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    // 1. Fetch categories server-to-server
    let liveCategories: VenopaiCategory[] = CANONICAL_CATEGORIES;
    const catIdToSlugMap = new Map<string, string>();

    try {
      const catRes = await fetch(`${backendUrl}/categories`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      });
      if (catRes.ok) {
        const catJson = await catRes.json();
        const catData = catJson?.data;
        if (Array.isArray(catData) && catData.length > 0) {
          liveCategories = catData;
          catData.forEach((c: any) => {
            if (c.id && c.slug) catIdToSlugMap.set(c.id, c.slug);
          });
        }
      }
    } catch {
      CANONICAL_CATEGORIES.forEach((c) => {
        catIdToSlugMap.set(c.slug, c.slug);
      });
    }

    // 2. Fetch products server-to-server
    const prodRes = await fetch(`${backendUrl}/products?page_size=100`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    clearTimeout(timeoutId);

    if (prodRes.ok) {
      const prodJson = await prodRes.json();
      const rawProducts = prodJson?.data || prodJson?.items || [];

      if (Array.isArray(rawProducts) && rawProducts.length > 0) {
        const normalized: VenopaiProduct[] = rawProducts.map((item: any) => {
          let catSlug = item.category_slug;
          if (!catSlug && Array.isArray(item.category_ids) && item.category_ids.length > 0) {
            catSlug = catIdToSlugMap.get(item.category_ids[0]);
          }
          if (!catSlug) {
            catSlug = 'microcontrollers-development';
          }

          const pricePaise =
            typeof item.price_paise === 'number'
              ? item.price_paise
              : Math.round(parseFloat(String(item.price || '0')) * 100);

          const comparePricePaise =
            typeof item.compare_price_paise === 'number'
              ? item.compare_price_paise
              : item.compare_price
              ? Math.round(parseFloat(String(item.compare_price)) * 100)
              : undefined;

          const images: string[] = [];
          if (item.primary_image_url) images.push(item.primary_image_url);
          if (Array.isArray(item.images)) {
            item.images.forEach((img: string) => {
              if (img && !images.includes(img)) images.push(img);
            });
          }

          let stockQty = 120;
          if (typeof item.stock_quantity === 'number') {
            stockQty = item.stock_quantity;
          } else if (item.stock_status === 'out_of_stock') {
            stockQty = 0;
          } else if (item.stock_status === 'low_stock') {
            stockQty = 5;
          }

          return {
            id: item.id,
            name: item.name,
            slug: item.slug,
            sku: item.sku || `SKU-${item.slug.slice(0, 14).toUpperCase()}`,
            category_slug: catSlug,
            price_paise: pricePaise,
            compare_price_paise: comparePricePaise,
            description: item.description || '',
            weight_grams: item.weight_grams,
            stock_quantity: stockQty,
            is_featured: Boolean(item.is_featured),
            images,
            specifications: Array.isArray(item.specifications) ? item.specifications : [],
          };
        });

        return NextResponse.json({
          categories: liveCategories,
          products: normalized,
          isLive: true,
        });
      }
    }
  } catch (err) {
    // Graceful fallback to canonical catalog
  }

  return NextResponse.json({
    categories: CANONICAL_CATEGORIES,
    products: CANONICAL_PRODUCTS,
    isLive: false,
  });
}
