"use client";

import CategoryPage from "../category-template/page-template";
import { PROTEINRIEGEL_PRODUCTS } from "@/app/data/products";

export default function ProteinriegelPage() {
  return (
    <CategoryPage
      title="Proteinriegel"
      icon="🍫"
      products={PROTEINRIEGEL_PRODUCTS}
    />
  );
}
