import type { LibraryBook } from "@/types";
import { toLibraryBook, type BookSummaryDto } from "@/lib/libraryBook";
import featured from "./library.featured.generated.json";

/**
 * The featured shelf of the StoryShelf Library: real public-domain classics, in
 * curated order. Generated from the API by `app.scripts.export_catalog` and
 * small on purpose, because client components (the 3D shelf, the library hero)
 * ship it to the browser. The full catalogue is server-side, in ./catalog.ts.
 */
export const featuredBooks: LibraryBook[] = (featured.books as BookSummaryDto[]).map(toLibraryBook);
