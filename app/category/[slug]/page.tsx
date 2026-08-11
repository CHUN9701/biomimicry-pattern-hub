import { categories } from "@/lib/data";
import CategoryScreen from "@/components/CategoryScreen";

/**
 * All 4 categories are compiled into the bundle, so the route set is fully known
 * at build time. Declaring it here is what turns this segment from
 * "ƒ server-rendered on demand" into a prerendered page: there is no server-side
 * data in this project, and a serverless function that cold-starts only to emit a
 * static shell is pure cost.
 */
export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

// Any slug outside that set is a 404, decided at build time rather than by
// rendering on the server to find out.
export const dynamicParams = false;

export default function CategoryPage({ params }: { params: { slug: string } }) {
  return <CategoryScreen slug={params.slug} />;
}
