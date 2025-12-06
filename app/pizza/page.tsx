"use client";

import CategoryPage from "../category-template/page-template";
import { PIZZA_PRODUCTS, PROTEINPULVER_PRODUCTS } from "@/app/data/products";

export default function pizzaPage() {
  return (
    <CategoryPage
      title="Pizza"
      icon="🍕"
      products={PIZZA_PRODUCTS}
    />
  );
}
