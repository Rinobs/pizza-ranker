"use client";

import CategoryPage from "../category-template/page-template";
import { PROTEINRIEGEL_PRODUCTS } from "@/app/data/products";

export default function ProteinriegelPage() {
  return <CategoryPage title="Proteinriegel" icon={"\u{1F36B}"} products={PROTEINRIEGEL_PRODUCTS} />;
}

