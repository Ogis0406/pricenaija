export const NIGERIAN_LOCATIONS = ["Lagos", "Abuja", "Ibadan", "Port Harcourt", "Benin", "Kano", "Enugu", "Kaduna"] as const;
export const PRODUCT_CATEGORIES = ["Food & Groceries", "Home & Energy", "Building Materials", "Electronics", "Appliances"] as const;
export const formatNaira = (amount: number) => `₦${Math.round(amount).toLocaleString("en-NG")}`;
export const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
