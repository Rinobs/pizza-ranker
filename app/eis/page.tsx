import CategoryPage from "../category-template/page-template";

const PRODUCTS = [
  { name: "Schoko", imageUrl: "..." },
  { name: "Erdbeere", imageUrl: "..." },
];

export default function Proteinpulver() {
  return (
    <CategoryPage
      title="Eis"
      icon="🍦"
      storageKey="eis"
      products={PRODUCTS}
    />
  );
}
