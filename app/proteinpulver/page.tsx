"use client";

import CategoryPage from "../category-template/page-template";
import { PROTEINPULVER_PRODUCTS } from "@/app/data/products";

export default function ProteinpulverPage() {
  return (
    <CategoryPage
      title="Proteinpulver"
      icon="🍫"
      storageKey="proteinpulver"
      products={PROTEINPULVER_PRODUCTS}
    />
  );
}
