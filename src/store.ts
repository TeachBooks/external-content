import { createSignal } from "solid-js";
import rawCatalog from "../chapters.json";

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
  deleteable?: boolean;
}

export const [books, setBooks] = createSignal(rawCatalog as unknown as Book[]);

export function deleteBook(book: Book) {
  setBooks(books().filter((b) => b !== book));
}

export function addBook(book: Book) {
  setBooks([...books(), book]);
}

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
