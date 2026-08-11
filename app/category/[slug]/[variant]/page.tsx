import { categories } from "@/lib/data";
import VariantScreen from "@/components/VariantScreen";

/**
 * All 12 variants are compiled in, so this segment's params are known at build
 * time — see the note in the parent route for why leaving it dynamic costs a
 * serverless function for nothing.
 *
 * Both params are enumerated here rather than just `variant`. The documented
 * nested pattern is for a child to receive the parent's generated params and
 * return only its own segment, but on next@14.2.35 this function is called
 * exactly once with an empty params object, so that pattern silently generates
 * nothing: the build still reports ● for the segment while prerendering zero of
 * its 12 pages. Verified by counting the emitted HTML, not by reading the badge.
 */
export function generateStaticParams() {
  return categories.flatMap((category) =>
    category.variants.map((variant) => ({ slug: category.slug, variant: variant.slug }))
  );
}

export const dynamicParams = false;

export default function VariantPage({
  params,
}: {
  params: { slug: string; variant: string };
}) {
  return <VariantScreen slug={params.slug} variantSlug={params.variant} />;
}
