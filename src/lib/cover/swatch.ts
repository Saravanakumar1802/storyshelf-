import type { Book } from "@/types";
import type { BookSwatch, Theme } from "@/theme";

/** The cloth/ink/foil colours a book is printed with. */
export function bookSwatch(theme: Theme, book: Pick<Book, "swatch" | "planSwatch">): BookSwatch {
  if (book.planSwatch) return theme.scene.planBooks[book.planSwatch];
  return theme.scene.books[book.swatch % theme.scene.books.length];
}
