"use client";

import CategoryPage from "../category-template/page-template";
import { CHIPS_PRODUCTS } from "@/app/data/products";

export default function ChipsPage() {
  return (
    <CategoryPage
      title="Chips"
      icon={"\u{1F35F}"}
      categorySlug="chips"
      products={CHIPS_PRODUCTS}
    />
  );
}

