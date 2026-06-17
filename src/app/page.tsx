import ProductKnowledgeBase from "./components/ProductKnowledgeBase";
import Nav from "./components/Nav";

export default function Home() {
  return (
    <main className="flex-1">
      <Nav active="knowledge" />
      <ProductKnowledgeBase />
    </main>
  );
}
