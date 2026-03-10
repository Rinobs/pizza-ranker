"use client";

import CategoryPage from "../category-template/page-template";
import { PIZZA_PRODUCTS } from "@/app/data/products";

export default function PizzaPage() {
  return <CategoryPage title="Pizza" icon={"\u{1F355}"} products={PIZZA_PRODUCTS} />;
}

