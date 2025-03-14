import { createSignal } from "solid-js";
import rawCatalog from "../catalog.json";

export interface TocEntry {
  title: string;
  html_url: string | null;
  external_url: string | null;
  children: TocEntry[];
}

export interface Book {
  title: string;
  logo: string;
  author: string;
  html_url: string;
  code_url: string;
  release: string;
  toc_path: string;
  toc: TocEntry;
}

export const books = rawCatalog as Book[];

interface SelectedExternal {
  book: Book;
  parents: string;
  entry: TocEntry;
}

const [externals, setExternals] = createSignal<SelectedExternal[]>([]);

export { externals };

export function toggleExternal(book: Book, entry: TocEntry, parents: string) {
  const index = externals().findIndex(
    (external) => external.book === book && external.entry === entry,
  );
  if (index === -1) {
    setExternals([...externals(), { book, entry, parents }]);
  } else {
    setExternals(externals().filter((_, i) => i !== index));
  }
}

export function checkedExternal(book: Book, entry: TocEntry) {
  return externals().some(
    (external) => external.book === book && external.entry === entry,
  );
}
export function clearExternals() {
  setExternals([]);
}
