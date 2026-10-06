import { eq } from "drizzle-orm";
import { businesses, categories, locations, products } from "../drizzle/schema";
import { closeDb, getDb } from "./db";

const categoryRows = [
  { name: "Food & Groceries", slug: "food-groceries" },
  { name: "Home & Energy", slug: "home-energy" },
  { name: "Building Materials", slug: "building-materials" },
  { name: "Electronics", slug: "electronics" },
  { name: "Appliances", slug: "appliances" },
];
const locationRows = ["Lagos", "Abuja", "Ibadan", "Port Harcourt", "Benin", "Kano", "Enugu", "Kaduna"].map(city => ({
  city,
  state: city === "Ibadan" ? "Oyo" : city === "Benin" ? "Edo" : city === "Port Harcourt" ? "Rivers" : city === "Lagos" ? "Lagos" : city === "Abuja" ? "FCT" : city === "Kano" ? "Kano" : city === "Enugu" ? "Enugu" : "Kaduna",
  slug: city.toLowerCase().replace(/\s+/g, "-"),
}));
const productRows = [
  ["Long-grain rice", "rice-25kg", "Food & Groceries", "25kg bag", "Premium local"],
  ["Cooking gas", "cooking-gas-5kg", "Home & Energy", "5kg refill", "LPG"],
  ["Cement", "cement-50kg", "Building Materials", "50kg bag", "General purpose"],
  ["Eggs", "eggs-crate", "Food & Groceries", "1 crate", "Farm fresh"],
  ["Garri", "garri-5kg", "Food & Groceries", "5kg", "White garri"],
  ["Brown beans", "beans-5kg", "Food & Groceries", "5kg", "Oloyin"],
  ["Palm oil", "palm-oil-5l", "Food & Groceries", "5 litres", "Red palm"],
  ["Family loaf", "bread-family-loaf", "Food & Groceries", "1 loaf", "Fresh bakery"],
  ["iPhone 13", "iphone-13", "Electronics", "128GB · used, good condition", "Apple"],
  ["Samsung Galaxy S23", "samsung-galaxy-s23", "Electronics", "256GB", "Samsung"],
  ["Business laptop", "laptop-core-i5", "Electronics", "Core i5 · 8GB RAM", "Various"],
  ["Petrol generator", "generator-2-5kva", "Appliances", "2.5kVA", "Various"],
  ["Smart TV", "television-55-inch", "Appliances", "55 inch", "Various"],
  ["Air conditioner", "air-conditioner-1-5hp", "Appliances", "1.5HP split unit", "Various"],
] as const;
const businessRows = [
  { name: "ABC Electronics", slug: "abc-electronics", category: "Electronics", city: "Ikeja, Lagos", description: "Demo profile — sample electronics retailer for development." },
  { name: "Bodija Wholesale", slug: "bodija-wholesale", category: "Food & Groceries", city: "Ibadan, Oyo", description: "Demo profile — sample food and household essentials." },
  { name: "Ikeja Gas Depot", slug: "ikeja-gas-depot", category: "Home & Energy", city: "Ikeja, Lagos", description: "Demo profile — sample cooking gas retailer." },
  { name: "Trade Fair Building Store", slug: "trade-fair-builders", category: "Building Materials", city: "Ojo, Lagos", description: "Demo profile — sample building supply retailer." },
];

export async function seedDemoCatalog() {
  const db = await getDb();
  if (!db) return { seeded: false, reason: "database unavailable" };
  try {
    const existingCategorySlugs = new Set((await db.select({ slug: categories.slug }).from(categories)).map(row => row.slug));
    for (const category of categoryRows) if (!existingCategorySlugs.has(category.slug)) await db.insert(categories).values(category);

    const existingLocationSlugs = new Set((await db.select({ slug: locations.slug }).from(locations)).map(row => row.slug));
    for (const location of locationRows) if (!existingLocationSlugs.has(location.slug)) await db.insert(locations).values(location);

    const categoryIds = new Map((await db.select({ id: categories.id, slug: categories.slug }).from(categories)).map(row => [row.slug, row.id]));
    const existingProductSlugs = new Set((await db.select({ slug: products.slug }).from(products)).map(row => row.slug));
    for (const [name, slug, categoryName, quantityLabel, brand] of productRows) {
      if (existingProductSlugs.has(slug)) continue;
      const categorySlug = categoryRows.find(item => item.name === categoryName)?.slug;
      await db.insert(products).values({ name, slug, categoryId: categorySlug ? categoryIds.get(categorySlug) ?? null : null, quantityLabel, brand, description: `${quantityLabel} · sample PriceNaija development catalogue entry.`, isDemo: true, isActive: true });
    }

    const locationsFound = await db.select().from(locations);
    const existingBusinessSlugs = new Set((await db.select({ slug: businesses.slug }).from(businesses)).map(row => row.slug));
    for (const business of businessRows) {
      if (existingBusinessSlugs.has(business.slug)) continue;
      const city = business.city.split(",")[0].trim();
      const fallbackCity = business.city.split(",").at(-1)?.trim();
      const location = locationsFound.find(item => item.city === city) ?? locationsFound.find(item => item.city === fallbackCity) ?? locationsFound[0];
      await db.insert(businesses).values({ name: business.name, slug: business.slug, description: business.description, category: business.category, locationId: location?.id ?? null, verificationStatus: "pending", isDemo: true });
    }

    const countRows = await db.select({ id: products.id }).from(products).where(eq(products.isDemo, true));
    console.info(`[PriceNaija] Demo catalogue ready (${countRows.length} sample products).`);
    return { seeded: true, count: countRows.length };
  } catch (error) {
    console.warn("[PriceNaija] Demo seed skipped; apply migrations first.", error instanceof Error ? error.message : "unknown error");
    return { seeded: false, reason: "schema not ready" };
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("server/seed.ts")) {
  seedDemoCatalog()
    .catch(error => { console.error("[PriceNaija] Demo seed failed.", error instanceof Error ? error.message : "unknown error"); process.exitCode = 1; })
    .finally(() => closeDb().catch(error => { console.error("[PriceNaija] Database pool close failed.", error instanceof Error ? error.message : "unknown error"); process.exitCode = 1; }));
}
