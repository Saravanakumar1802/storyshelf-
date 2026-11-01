import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalog, catalogBySlug, similarTo } from "@/data/catalog";
import { BookDetail } from "@/components/library/BookDetail";
import { BookTabs } from "@/components/library/BookTabs";
import { AlsoLike } from "@/components/library/AlsoLike";
import { summaryOf } from "@/lib/libraryBook";
import { JsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";

// one static page per book in the build snapshot; books added later open at /library/view?book=
export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/library/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const b = catalogBySlug(slug);
  if (!b) return {};
  const description = `Read ${b.title} by ${b.author} free in the StoryShelf Library — ${b.chapterCount} chapters, about ${Math.round(b.readingMinutes / 60)} hours. ${b.opening}`.slice(0, 300);
  return {
    title: `${b.title} by ${b.author} — read free`,
    description,
    alternates: { canonical: `/library/${b.slug}` },
    openGraph: { title: `${b.title} by ${b.author}`, description, type: "book" },
  };
}

export default async function BookPage({ params }: PageProps<"/library/[slug]">) {
  const { slug } = await params;
  const book = catalogBySlug(slug);
  if (!book) notFound();
  const similar = similarTo(book);
  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Book",
          name: book.title,
          author: { "@type": "Person", name: book.author },
          inLanguage: book.language,
          genre: book.genre,
          numberOfPages: book.pages,
          wordCount: book.words,
          isAccessibleForFree: true,
          license: "https://creativecommons.org/publicdomain/mark/1.0/",
          url: `${SITE_URL}/library/${book.slug}`,
          publisher: { "@type": "Organization", name: SITE_NAME },
        }}
      />
      {/* key: remount viewer state when moving between books */}
      <BookDetail key={book.id} book={summaryOf(book)} />
      <BookTabs key={`tabs-${book.id}`} book={book} />
      <AlsoLike
        key={`also-${book.id}`}
        books={similar.books}
        {...(similar.byMeaning ? { eyebrow: "✨ Similar in spirit", title: "Matched by meaning, not keywords" } : {})}
      />
    </main>
  );
}
