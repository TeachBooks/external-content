import {
  type Component,
  For,
  Show,
  createMemo,
  createSignal,
  createUniqueId,
  onMount,
} from "solid-js";
import { Button, buttonVariants } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Checkbox } from "./components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import {
  TextField,
  TextFieldDescription,
  TextFieldInput,
  TextFieldLabel,
} from "./components/ui/text-field";
import { Toaster, showToast, showToastPromise } from "./components/ui/toast";
import { harvestBook } from "./harvest";
import {
  MdiBookOpenBlankVariantOutline,
  MdiClipboardTextOutline,
  MdiDelete,
  MdiGithub,
  MdiGitlab,
  MdiLaunch,
  MdiMinusBoxOutline,
  MdiPlusBoxOutline,
  MdiShareVariant,
} from "./icons";
import { decodeBooks, encodeBooks } from "./lib/io";
import {
  type Book,
  type BookMeta,
  type TocEntry,
  addBook,
  books,
  checkedExternal,
  clearExternals,
  deleteBook,
  externals,
  metaOfBook,
  setBooks,
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
    <div class="flex flex-row items-center gap-1 py-1">
      <Checkbox id={id} onChange={onChange} checked={checked()} />
      <Label for={`${id}-input`}>{props.entry.title}</Label>
      <Show when={props.entry.html_url}>
        <a
          // biome-ignore lint/style/noNonNullAssertion: already checked
          href={props.entry.html_url!}
          target="_blank"
          rel="noreferrer"
        >
          <MdiLaunch />
        </a>
      </Show>
    </div>
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
  const [expanded, setExpanded] = createSignal(false);

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
        <Collapsible open={expanded()} onOpenChange={setExpanded}>
          <Show
            when={props.entry.html_url}
            fallback={
              <CollapsibleTrigger class="flex items-center gap-1">
                <div class="py-1">{props.entry.title}</div>
                <Show when={expanded()} fallback={<MdiPlusBoxOutline />}>
                  <MdiMinusBoxOutline />
                </Show>
              </CollapsibleTrigger>
            }
          >
            <div class="flex items-center gap-1">
              <TocHeader
                entry={props.entry}
                book={props.book}
                parents={parents()}
              />
              <CollapsibleTrigger>
                <Show when={expanded()} fallback={<MdiPlusBoxOutline />}>
                  <MdiMinusBoxOutline />
                </Show>
              </CollapsibleTrigger>
            </div>
          </Show>
          <CollapsibleContent>
            <ol class="ml-4 list-inside">
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
          </CollapsibleContent>
        </Collapsible>
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
    <Card class="w-96">
      <CardHeader class="pb-2">
        <div class="flex flex-row items-start justify-between gap-1">
          <img
            class="size-24 object-contain"
            src={props.book.logo}
            alt={props.book.title}
          />
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
            <Show when={props.book.deleteable}>
              <button
                type="button"
                onClick={() => {
                  deleteBook(props.book);
                }}
              >
                <MdiDelete />
              </button>
            </Show>
          </div>
        </div>
        <CardTitle class="text-xl">{props.book.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Author contains html which does not render nicely
        TODO strip html or render pretty */}
        {/* <p innerHTML={props.book.author} /> */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger>Chapters</CollapsibleTrigger>
          <CollapsibleContent>
            <ol class="ml-4 list-inside">
              <For each={props.book.toc.children}>
                {(entry) => <TocEntryItem entry={entry} book={props.book} />}
              </For>
            </ol>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

const InstructionActions: Component = () => {
  return (
    <>
      <h2 class="py-4 text-2xl">Actions</h2>
      <div class="flex flex-col items-start gap-2 px-12">
        <Dialog>
          <DialogTrigger as={Button<"button">} variant="default" class="w-full">
            Mail someone instructions to incorporate these chapters
          </DialogTrigger>
          <DialogContent>
            <MailInstructions />
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger as={Button<"button">} variant="outline" class="w-full">
            Show how do it yourself instructions
          </DialogTrigger>
          <DialogContent class="max-w-4xl">
            <DiyInstructions />
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={clearExternals} class="w-full">
          Clear selection
        </Button>
      </div>
    </>
  );
};

const MailInstructions: Component = () => {
  const text = createMemo(() => {
    const toc = externals()
      .map((external) => `- external: ${external.entry.external_url}`)
      .join("\n");
    return `Please add the following chapters to the teach book, by copying below into "parts" section of the "book/_toc.yml" file:\n
${toc}\n
\n
`;
  });
  const mailto = createMemo(
    () =>
      `mailto:?subject=Add external teachbook chapters&body=${encodeURIComponent(text())}`,
  );

  async function copyText() {
    await navigator.clipboard.writeText(text());
    showToast({
      title: "Copied instructions to clipboard",
      variant: "success",
    });
  }
  return (
    <div class="mt-4">
      <h2 class="text-2xl">Mail instructions</h2>
      <ol class="list-inside list-decimal">
        <li>
          <a class={buttonVariants({ variant: "outline" })} href={mailto()}>
            Click to open your email client
          </a>{" "}
          or
          <Button variant="outline" class="mt-2" onClick={copyText}>
            Click to copy instructions to clipboard
          </Button>{" "}
          and paste into a new email
        </li>
        <li>Add recipient</li>
        <li>
          Adjust subject, so recipient knows in which teach book to make changes
        </li>
        <li>Send the email</li>
      </ol>
    </div>
  );
};

const DiyInstructions: Component = () => {
  const text = createMemo(() =>
    externals()
      .map((external) => `- external: ${external.entry.external_url}`)
      .join("\n"),
  );
  async function copyText() {
    await navigator.clipboard.writeText(text());
    showToast({
      title: "Copied externals to clipboard",
      variant: "success",
    });
  }

  return (
    <div class="mt-4">
      <h2 class="text-2xl">Instructions</h2>
      <ol class="list-inside list-decimal">
        <li>
          <Button
            variant="ghost"
            onClick={copyText}
            class="inline-flex items-center justify-center rounded-md border font-medium text-sm ring-offset-background transition-colors hover:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 "
          >
            Copy <MdiClipboardTextOutline />
          </Button>{" "}
          the following text to clipboard:
          <pre class="my-4 max-w-3xl overflow-y-auto bg-gray-10 p-4">
            {text()}
          </pre>
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
  );
};

function AddBookCard() {
  const [open, setOpen] = createSignal(false);

  async function onSubmit(event: Event) {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const promise = harvestBook({
      html_url: formData.get("html_url") as string,
      code_url: formData.get("code_url") as string,
      release: formData.get("release") as string,
      toc_path: formData.get("toc_path") as string,
    });
    showToastPromise(promise, {
      loading: "Fetching chapters of book",
      success: (book) => {
        if (open()) {
          // When you added it you are allow to delete it
          book.deleteable = true;
          addBook(book);
          setOpen(false);
        }
        return "Book added";
      },
      error: (e: unknown) => {
        console.error(e);
        return "Failed to fetch chapters";
      },
      duration: 5000,  // Default
    });
  }
  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger
        as={Button<"button">}
        variant="outline"
        size="lg"
        class="h-80 w-96 text-xl"
      >
        Add a book
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a book</DialogTitle>
        </DialogHeader>
        {/* TODO show form */}
        <form onSubmit={onSubmit}>
          <div class="flex flex-col gap-4 py-4">
            <TextField name="html_url">
              <TextFieldLabel>Website URL</TextFieldLabel>
              <TextFieldDescription>
                Normally ends with intro.html
              </TextFieldDescription>
              <TextFieldInput type="url" required />
            </TextField>
            <TextField name="code_url">
              <TextFieldLabel>Code repository URL</TextFieldLabel>
              <TextFieldInput type="url" required />
            </TextField>
            <TextField name="release">
              <div>
                <TextFieldLabel>Release version</TextFieldLabel>
                <TextFieldDescription>
                  Can be tag, branch or commit hash.
                </TextFieldDescription>
              </div>
              <TextFieldInput type="text" required value="main" />
            </TextField>
            <TextField name="toc_path">
              <TextFieldLabel>Path of _toc.yml</TextFieldLabel>
              <TextFieldInput type="text" value="book/_toc.yml" required />
            </TextField>
          </div>
          <DialogFooter>
            <Button type="submit">Add a book</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const shareBooksUrl = () => {
  const meta = books()
    .filter((b) => b.deleteable)
    .map(metaOfBook);
  const searchParams = new URLSearchParams();
  searchParams.set("books", encodeBooks(meta));
  return `?${searchParams.toString()}`;
};

const App: Component = () => {
  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const bookmetas = params.get("books");
    if (bookmetas) {
      const parsedBookmetas = decodeBooks(bookmetas);
      showToastPromise(fetchChapters(parsedBookmetas), {
        loading: "Fetching chapters of books",
        success: () => "Books loaded",
        error: (e: unknown) => {
          console.error(e);
          return "Failed to fetch chapters";
        },
        duration: 1000,
      });
    }
    const bookmetasUrl = params.get("books_url");
    if (bookmetasUrl) {
      const response = await fetch(bookmetasUrl);
      const raw = await response.text();
      const parsedBookmetas = decodeBooks(raw);
      setBooks([]);
      showToastPromise(fetchChapters(parsedBookmetas), {
        loading: "Fetching chapters of books",
        success: () => "Books loaded",
        error: (e: unknown) => {
          console.error(e);
          return "Failed to fetch chapters";
        },
        duration: 1000,
      });
    }
  });

  return (
    <div class="w-full px-4">
      <div>
        <h1 class="py-4 text-3xl">Teachbook recombiner</h1>
        <p>
          Select chapters from the available teach books to incorporate into
          your own teach book. Click <MdiPlusBoxOutline class="inline" /> to see
          chapters in books.
        </p>
      </div>
      <div class="flex w-full flex-row gap-4">
        <div class="w-1/3">
          <h2 class="py-4 text-2xl">Selected chapters</h2>
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
          <Show
            when={externals().length > 0}
            fallback={<p>No teach book chapters have been selected.</p>}
          >
            <InstructionActions />
          </Show>
        </div>
        <div class="">
          <h2 class="pb-2 text-2xl">
            Available teach books{" "}
            <Show when={shareBooksUrl().length > 13}>
              <a href={shareBooksUrl()} target="_blank" rel="noreferrer">
                <MdiShareVariant class="inline" />
              </a>
            </Show>
          </h2>
          <div class="flex flex-row flex-wrap gap-2">
            <For each={books()}>{(book) => <BookCard book={book} />}</For>
            <AddBookCard />
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

async function fetchChapters(parsedBookmetas: BookMeta[]) {
  for (const bookmeta of parsedBookmetas) {
    if (
      books().some(
        (book) =>
          book.code_url === bookmeta.code_url &&
          book.release === bookmeta.release &&
          book.toc_path === bookmeta.toc_path &&
          book.html_url === bookmeta.html_url,
      )
    ) {
      continue;
    }
    try {
      const book = await harvestBook(bookmeta);
      if (book) {
        book.deleteable = true;
        addBook(book);
      }
    } catch (error) {
      console.error(
        `Failed to fetch book ${bookmeta.code_url} ${bookmeta.release} ${bookmeta.toc_path} ${bookmeta.html_url}`,
        error,
      );
    }
  }
}

export default App;
