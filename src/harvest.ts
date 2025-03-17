import { parse } from "yaml";
import type { Book, TocEntry } from "./store";

export interface BookQuery {
    html_url: string;
    code_url: string;
    release: string;
    toc_path: string;
}

function makeDownloadUrl(code_url: string, release:string, path: string): string {
    // Output should be like:
    // * https://github.com/TeachBooks/manual/raw/refs/tags/v1.1.1/book/intro.md
    // * https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/raw/v0.1/book/intro.md
    if (code_url.includes("github.com")) {
        if (release === "main") {
            return `${code_url}/raw/refs/heads/main/${path}`;
        }
        return `${code_url}/raw/refs/tags/${release}/${path}`;
    }
    if (code_url.includes("gitlab")) {
        if (code_url.split("/").length > 4) {
            // Has subgroup
            return `${code_url}/raw/${release}/${path}`;
        }
        return `${code_url}/-/raw/${release}/${path}`;
    }
    throw new Error("Only GitHub and GitLab are supported");
}

async function tocFromCode(query: BookQuery): Promise<any> {
    const url = makeDownloadUrl(query.code_url, query.release, query.toc_path);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}`);
    }
    const content = await response.text();
    // For structure of toc see https://jupyterbook.org/en/stable/structure/toc.html
    const toc = parse(content);
    return toc;
}

async function tocFromHtml(url: string): Promise<Array<[string, string]>> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}`);
    }
    const html = await response.text();
    let doc: Document;
    if (typeof DOMParser === "undefined") {
        const { JSDOM } = await import("jsdom");
        doc = new JSDOM(html).window.document;
    } else {
        const parser = new DOMParser();
        doc = parser.parseFromString(html, "text/html");
    }
    let toc: Element |null | undefined = doc.getElementById("bd-docs-nav")
    if (!toc) {
        toc = doc.getElementsByClassName("bd-docs-nav")[0]
    }
    if (!toc) {
        throw new Error("No table of contents found in HTML")
    }
    const links = Array.from(toc.querySelectorAll('a[href]'));
    return links.map(link => {        
        const l: [string, string] = [
            link.getAttribute('href') || '',
            link.textContent?.trim() || '',
        ];
        return l;
    }).filter(l => l[0] && l[1]);
}

async function configFromCode(query: BookQuery): Promise<{
    title: string;
    logo: string;
    author: string;
}> {
    const configPath = query.toc_path.replace("_toc.yml", "_config.yml");
    const url = makeDownloadUrl(query.code_url, query.release, configPath);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}`);
    }
    const config = parse(await response.text());
    
    let logo: string;
    if ("logo" in config) {
        const relLogo = query.toc_path.replace("_toc.yml", config.logo);
        logo = makeDownloadUrl(query.code_url, query.release, relLogo);
    } else {
        const relLogo = config.sphinx.config.html_theme_options.logo.image_light;
        const staticPath = config.sphinx.config.html_static_path[0];
        const absStaticPath = query.toc_path.replace("_toc.yml", staticPath);
        logo = makeDownloadUrl(query.code_url, query.release, `${absStaticPath}/${relLogo}`);
    }
    
    return {
        title: config.title,
        logo: logo,
        author: config.author
    };
}

function pathToName(path: string): string {
    // Given foo/bar/baz.md, return baz
    // Given foo/bar/nb.ipynb, return nb
    // Given foo/bar.baz.md return bar.baz
    const last = path.split("/").pop();
    if (!last) {
        throw new Error("Empty path");
    }
    const names = last.split(".");
    names.pop();
    return names.join(".");
}

function pathWithSuffix(path: string, suffix: string) {
    const names = path.split(".");
    names.pop();
    return names.join(".") + suffix;
}

function findTitle(file: string, tocHtml: Array<[string, string]>): [string, string] {
    const htmlPath = encodeURI(pathWithSuffix(file, '.html'));
    const searchPath = file === "#" ? file : htmlPath;
    console.log({htmlPath, file, tocHtml})
    for (const [path, title] of tocHtml) {
        if (searchPath === path) {
            return [title, path];
        }
    }
    
    throw new Error(`Title not found for '${file}'`);
}

function makeExternalUrl(query: BookQuery, filePath: string): string {
    // Output should be like:
    // * https://github.com/ORGANIZATION/REPOSITORY/blob/TAG/path/to/file.md
    // * https://gitlab.domainname.tld/GROUP/PROJECT/-/blob/TAG/path/to/file.md
    // * https://gitlab.domainname.tld/GROUP/SUBGROUP/PROJECT/blob/TAG/path/to/file.md
    let path = filePath;
    if (path.indexOf('.') === -1) {
        // No file extension, assume .md
        path = `${path}.md`;
    }
    
    path = query.toc_path.replace("_toc.yml", path);
    
    if (query.code_url.includes("github.com")) {
        return `${query.code_url}/blob/${query.release}/${path}`;
    } 
    if (query.code_url.includes("gitlab")) {
        if (query.code_url.split('/').length > 4) {
            // Has subgroup
            return `${query.code_url}/blob/${query.release}/${path}`;
        }
        return `${query.code_url}/-/blob/${query.release}/${path}`;
    } 
    throw new Error("Only GitHub and GitLab are supported");
}

function contentEntry(
    query: BookQuery, 
    entry: any, 
    tocHtml: Array<[string, string]>, 
    rootHtmlUrl: string
): TocEntry {
    if ("file" in entry) {
        const [title, htmlUrl] = findTitle(entry.file, tocHtml);
        return {
            title: title,
            html_url: rootHtmlUrl + htmlUrl,
            external_url: makeExternalUrl(query, entry.file),
            children: []
        };
    } 
    if ("url" in entry && "title" in entry) {
        return {
            title: entry.title,
            html_url: entry.url,
            children: []
        };
    }
    if ("external" in entry) {
        throw new Error("External content not supported");
    }
    throw new Error(`Unknown type of content entry: ${JSON.stringify(entry)}`);
}

function mergeTocs(query: BookQuery, tocYml: any, tocHtml: Array<[string, string]>): TocEntry {
    const rootPath = query.toc_path.replace("_toc.yml", tocYml.root);
    const rootFile = `${pathToName(tocYml.root)}.html`;
    const rootHtmlUrl = query.html_url.replace(rootFile, "");
    const rootCodeUrl = makeExternalUrl(query, rootPath);
    
    const toc: TocEntry = {
        title: "",
        html_url: query.html_url,
        external_url: rootCodeUrl,
        children: []
    };
    
    if ("parts" in tocYml) {
        for (const part of tocYml.parts) {
            const partToc: TocEntry = { title: part.caption, children: [] };
            toc.children.push(partToc);
            
            for (const chapter of part.chapters) {
                const chapterToc = contentEntry(query, chapter, tocHtml, rootHtmlUrl);
                partToc.children.push(chapterToc);
                
                if ("sections" in chapter) {
                    for (const section of chapter.sections) {
                        try {
                            const sectionToc = contentEntry(query, section, tocHtml, rootHtmlUrl);
                            chapterToc.children.push(sectionToc);
                            
                            if ("sections" in section) {
                                for (const subsection of section.sections) {
                                    const subsectionToc = contentEntry(query, subsection, tocHtml, rootHtmlUrl);
                                    sectionToc.children.push(subsectionToc);
                                    
                                    if ("sections" in subsection) {
                                        for (const subsubsection of subsection.sections) {
                                            const subsubsectionToc = contentEntry(query, subsubsection, tocHtml, rootHtmlUrl);
                                            subsectionToc.children.push(subsubsectionToc);
                                        }
                                    }
                                }
                            }
                        } catch (error) {
                            // Keep chapter as section container if section title not found
                            if ("sections" in section) {
                                for (const subsection of section.sections) {
                                    const subsectionToc = contentEntry(query, subsection, tocHtml, rootHtmlUrl);
                                    chapterToc.children.push(subsectionToc);
                                }
                            }
                        }
                    }
                }
            }
        }
    } else {
        for (const chapter of tocYml.chapters) {
            const chapterToc = contentEntry(query, chapter, tocHtml, rootHtmlUrl);
            toc.children.push(chapterToc);
            
            if ("sections" in chapter) {
                for (const section of chapter.sections) {
                    const sectionToc = contentEntry(query, section, tocHtml, rootHtmlUrl);
                    chapterToc.children.push(sectionToc);
                }
            }
        }
    }
    
    return toc;
}

export async function harvestBook(query: BookQuery): Promise<Book> {
    const tocYml = await tocFromCode(query)
    const tocHtml = await tocFromHtml(query.html_url)
    const config = await configFromCode(query)
    const toc = mergeTocs(query, tocYml, tocHtml)
    if (config.title === 'Template' && query.code_url) {
        // biome-ignore lint/style/noNonNullAssertion: tested in if above
        config.title = query.code_url.split('/').pop()!
    }
    if (!toc.title) {
        toc.title = config.title
    }
    return {
        ...query,
        ...config,
        toc,
    }
}
