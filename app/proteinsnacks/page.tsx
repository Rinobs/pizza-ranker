"use client";

import CategoryPage from "../category-template/page-template";
import { PROTEINSNACKS_PRODUCTS } from "@/app/data/products";

export default function ProteinsnacksPage() {
  return (
    <CategoryPage
      title="Proteinsnacks"
      icon={"\u{1F96E}"}
      categorySlug="proteinsnacks"
      products={PROTEINSNACKS_PRODUCTS}
    />
  );
}
