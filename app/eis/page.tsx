"use client";

import CategoryPage from "../category-template/page-template";
import { Eis_PRODUCTS } from "@/app/data/products";

export default function EisPage() {
  return (
    <CategoryPage
      title="Eis"
      icon="🍦"
      products={Eis_PRODUCTS}
    />
  );
}
