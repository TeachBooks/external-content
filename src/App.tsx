import {
  type Component,
  For,
  Show,
  createMemo,
  createUniqueId,
} from "solid-js";
import {
  MdiBookOpenBlankVariantOutline,
  MdiClipboard,
  MdiGithub,
  MdiGitlab,
} from "./icons";
import {
  type Book,
  type TocEntry,
  books,
  checkedExternal,
  externals,
  toggleExternal,
} from "./store";

const TocHeader: Component<{ entry: TocEntry; book: Book; parents: string }> = (
  props,
) => {
  const id = createUniqueId();
  const onChange = () => {
    toggleExternal(props.book, props.entry, props.parents);
  };
  const checked = createMemo(() => checkedExternal(props.book, props.entry));

  return (
    <Show
      when={props.entry.html_url}
      fallback={<div class="inline">{props.entry.title}</div>}
    >
      <div class="inline">
        <input
          type="checkbox"
          id={id}
          onChange={onChange}
          checked={checked()}
        />{" "}
        <label for={id}>{props.entry.title}</label>
      </div>
    </Show>
  );
};

const TocEntryItem: Component<{
  entry: TocEntry;
  book: Book;
  parents?: string;
}> = (props) => {
  const parents = createMemo(() =>
    props.parents
      ? `${props.parents} / ${props.entry.title}`
      : props.entry.title,
  );
  return (
    <li>
      <Show
        when={props.entry.children.length > 0}
        fallback={
          <TocHeader
            entry={props.entry}
            book={props.book}
            parents={parents()}
          />
        }
      >
        <details>
          <summary>
            <TocHeader
              entry={props.entry}
              book={props.book}
              parents={parents()}
            />
          </summary>

          <ol class="ml-8 list-inside">
            <For each={props.entry.children}>
              {(child) => (
                <TocEntryItem
                  entry={child}
                  book={props.book}
                  parents={parents()}
                />
              )}
            </For>
          </ol>
        </details>
      </Show>
    </li>
  );
};

const ExternalCard: Component<{
  book: Book;
  entry: TocEntry;
  parents: string;
}> = (props) => {
  return (
    <li>
      {props.book.title} / {props.parents}
    </li>
  );
};

const BookCard: Component<{ book: Book }> = (props) => {
  return (
    <div class="w-96 border p-4 shadow">
      <h2 class="text-xl">{props.book.title}</h2>
      <img
        class="size-32 object-contain"
        src={props.book.logo}
        alt={props.book.title}
      />
      {/* <p innerHTML={props.book.author} /> */}
      <div class="flex flex-row gap-2">
        <a href={props.book.html_url} aria-label="Read online">
          <MdiBookOpenBlankVariantOutline />
        </a>
        <a href={props.book.code_url} aria-label="View code">
          <Show
            when={props.book.code_url.includes("github")}
            fallback={<MdiGitlab />}
          >
            <MdiGithub />
          </Show>
        </a>
      </div>
      <details open>
        <summary>Chapters</summary>

        <ol class="ml-4 list-inside">
          <For each={props.book.toc.children}>
            {(entry) => <TocEntryItem entry={entry} book={props.book} />}
          </For>
        </ol>
      </details>
    </div>
  );
};

const Instructions: Component = () => {
  const text = createMemo(() =>
    externals()
      .map((external) => `- external: ${external.entry.external_url}`)
      .join("\n"),
  );
  async function copyText() {
    await navigator.clipboard.writeText(text());
  }

  return (
    <Show
      when={externals().length > 0}
      fallback={<p>No book chapters have been selected.</p>}
    >
      <div class="mt-4">
        <h2 class="text-2xl">Instructions</h2>
        <ol class="list-inside list-decimal">
          <li>
            <button
              type="button"
              onClick={copyText}
              class="inline-flex items-center justify-center rounded-md border font-medium text-sm ring-offset-background transition-colors hover:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 "
            >
              Copy <MdiClipboard />
            </button>{" "}
            the following text
            <pre class="my-4 w-80 overflow-auto">{text()}</pre>
          </li>
          <li>
            Paste it into <i>parts:</i> or <i>chapters:</i> section in the{" "}
            <i>book/_toc.yml</i> file of your teach book repository
          </li>
          <li>Commit and push the changes</li>
          <li>
            Wait for GitHub action workflow to deploy your teach book with the
            selected external chapters.
          </li>
        </ol>
      </div>
    </Show>
  );
};

const App: Component = () => {
  return (
    <div class="w-full p-1">
      <h1 class="text-3xl">Teachbook recombiner</h1>
      <div class="flex w-full flex-row gap-4">
        <div class="">
          <h2 class="text-2xl">Selected chapters</h2>
          <ul class="list-inside list-disc">
            <For each={externals()}>
              {(external) => (
                <ExternalCard
                  book={external.book}
                  entry={external.entry}
                  parents={external.parents}
                />
              )}
            </For>
          </ul>
          <Instructions />
        </div>
        <div class="">
          <h2 class="text-2xl">Available teach books</h2>
          <div class="flex flex-row flex-wrap gap-2">
            <For each={books}>{(book) => <BookCard book={book} />}</For>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
