import { createResource, createSignal } from "solid-js";
import { isServer } from "solid-js/web";

export interface TocEntry {
  title: string;
  html_url: string | null;
  external_url: string | null;
  children: TocEntry[];
}

export interface BookMeta {
  html_url: string;
  code_url: string;
  release: string;
  toc_path: string;
}

export interface Book extends BookMeta {
  title: string;
  logo: string;
  author: string;
  toc: TocEntry;
  deleteable?: boolean;
}

export function metaOfBook(book: Book): BookMeta {
  return {
    html_url: book.html_url,
    code_url: book.code_url,
    release: book.release,
    toc_path: book.toc_path,
  };
}

async function fetchChapters(source: string): Promise<Book[]> {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Failed to fetch chapters: ${response.statusText}`);
  }
  return await response.json();
}

let source = '/chapters.json'
if (!isServer) {
  const params = new URLSearchParams(window.location.search);
  const sourceParam = params.get('chapters');
  if (sourceParam) {
    source = sourceParam;
  }
} 

export const [books, {mutate: setBooks}] = createResource<Book[]>(
  () => source,
  fetchChapters
);

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
