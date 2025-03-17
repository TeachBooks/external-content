import { parse } from 'yaml'
import { readFile, writeFile } from 'node:fs/promises'
import type { Book } from './store.ts';
import { harvestBook, type BookQuery } from './harvest.ts';

async function main(books_file='books.yml', chapters_file='chapters.json') {
    const queries = parse(await readFile(books_file, 'utf-8')) as BookQuery[]
    const books: Book[] = []
    for (const query of queries) {
        const book = await harvestBook(query)
        books.push(book)
    }
    await writeFile(chapters_file, JSON.stringify(books, null, 2))
}

await main();
