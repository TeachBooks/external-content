import {
  type Component,
  For,
  Show,
  createMemo,
  createSignal,
  createUniqueId,
} from "solid-js";
import { Button, buttonVariants } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Checkbox } from "./components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";
import { Dialog, DialogContent, DialogTrigger } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Toaster, showToast } from "./components/ui/toast";
import {
  MdiBookOpenBlankVariantOutline,
  MdiClipboardTextOutline,
  MdiGithub,
  MdiGitlab,
  MdiLaunch,
  MdiMinusBoxOutline,
  MdiPlusBoxOutline,
} from "./icons";
import {
  type Book,
  type TocEntry,
  books,
  checkedExternal,
  clearExternals,
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
    <div class="flex flex-row items-center gap-1 py-1">
      <Checkbox id={id} onChange={onChange} checked={checked()} />
      <Label for={`${id}-input`}>
        {props.entry.title}
      </Label>
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
          <pre class="my-4 max-w-3xl overflow-y-auto bg-gray-10 p-4">{text()}</pre>
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

const App: Component = () => {
  return (
    <div class="w-full p-2">
      <div>
        <h1 class="pt-8 text-3xl">Teachbook recombiner</h1>
        <p class="py-4">
          Select chapters from the available teach books to incorporate into
          your own teach book.
        </p>
      </div>
      <div class="flex w-full flex-row gap-4">
        <div class="max-w-xl">
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
          <h2 class="text-2xl">Available teach books</h2>
          <div class="flex flex-row flex-wrap gap-2">
            <For each={books}>{(book) => <BookCard book={book} />}</For>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default App;
