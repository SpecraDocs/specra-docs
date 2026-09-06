import { MeiliSearch } from "meilisearch"
import fs from "fs"
import path from "path"
import matter from "gray-matter"
// Import from specra's server-safe JS modules directly rather than the package
// barrel ("specra"), which is a Svelte library that pulls in `$app/*` virtuals
// and .svelte files that only resolve inside a Vite/SvelteKit build — not in a
// standalone tsx script.
import { getConfig, initConfig } from "../node_modules/specra/dist/config.server.js"
import { extractSearchText } from "../node_modules/specra/dist/components/docs/componentTextProps.js"
import specraConfig from "../specra.config.json"
// import { extractSearchText } from "specra/components"
// import { extractSearchText } from "@/components/docs/componentTextProps"

interface SearchDocument {
    id: string
    title: string
    content: string
    slug: string
    version: string
    locale: string
    category?: string
    tags?: string[]
    tab_group?: string
}


async function indexDocuments() {
    initConfig(specraConfig as any)
    const config = getConfig()
    console.log(config)
    const searchConfig = config.search

    if (!searchConfig?.enabled || searchConfig.provider !== "meilisearch") {
        console.error("Meilisearch is not enabled in config")
        process.exit(1)
    }

    const meilisearchConfig = searchConfig.meilisearch
    if (!meilisearchConfig) {
        console.error("Meilisearch configuration is missing")
        process.exit(1)
    }

    console.log("Connecting to Meilisearch at:", meilisearchConfig.host)

    const client = new MeiliSearch({
        host: meilisearchConfig.host,
        apiKey: meilisearchConfig.apiKey || "",
    })

    const index = client.index(meilisearchConfig.indexName)

    // i18n config drives how locale is derived from filenames and how the
    // canonical (locale-prefixed) slug is built — must match specra's mdx loader.
    const i18nRaw = config.features?.i18n as any
    const i18nConfig = i18nRaw && typeof i18nRaw === "object" ? i18nRaw : null
    const locales: string[] = i18nConfig?.locales ?? []
    const defaultLocale: string = i18nConfig?.defaultLocale ?? "en"
    const prefixDefault: boolean = i18nConfig?.prefixDefault ?? false

    // Get all MDX files
    const docsDir = path.join(process.cwd(), "docs")
    const documents: SearchDocument[] = []

    function processDirectory(dir: string, version: string) {
        const files = fs.readdirSync(dir)

        for (const file of files) {
            const filePath = path.join(dir, file)
            const stat = fs.statSync(filePath)

            if (stat.isDirectory()) {
                processDirectory(filePath, version)
            } else if (file.endsWith(".mdx") || file.endsWith(".md")) {
                const content = fs.readFileSync(filePath, "utf-8")
                const { data, content: mdxContent } = matter(content)

                // Build the logical path from the file (no extension).
                const relativePath = path.relative(path.join(docsDir, version), filePath)
                const rawPath = relativePath
                    .replace(/\.(mdx|md)$/, "")
                    .replace(/\\/g, "/")

                // Detect a locale suffix on the filename (e.g. about.de,
                // configuration/advanced.fr). Mirrors specra's getAllDocs.
                let logicalSlug = rawPath
                let locale = defaultLocale
                if (i18nConfig) {
                    const parts = rawPath.split(".")
                    const lastPart = parts[parts.length - 1]
                    if (locales.includes(lastPart)) {
                        locale = lastPart
                        logicalSlug = parts.slice(0, -1).join(".")
                    }
                }

                // Canonical slug matches how the app routes docs: locale is a
                // path PREFIX, added when prefixDefault or for non-default locales.
                const usePrefix = i18nConfig && (prefixDefault || locale !== defaultLocale)
                const slug = usePrefix ? `${locale}/${logicalSlug}` : logicalSlug

                // Extract category from the logical path (not the locale prefix).
                const pathParts = logicalSlug.split("/")
                const category = pathParts.length > 1 ? pathParts[0] : undefined

                // Get tab_group from frontmatter or from parent _category_.json
                let tabGroup = data.tab_group

                // If not in frontmatter, check parent directory's _category_.json
                if (!tabGroup && pathParts.length > 1) {
                    const folderPath = pathParts.slice(0, -1).join("/")
                    const categoryPath = path.join(docsDir, version, folderPath, "_category_.json")

                    if (fs.existsSync(categoryPath)) {
                        try {
                            const categoryData = JSON.parse(fs.readFileSync(categoryPath, "utf-8"))
                            tabGroup = categoryData.tab_group
                        } catch (e) {
                            // Ignore JSON parse errors
                        }
                    }
                }

                // Clean content (remove code blocks and special chars for better search)
                // const cleanContent = mdxContent
                //     .replace(/```[\s\S]*?```/g, "") // Remove code blocks
                //     .replace(/`[^`]+`/g, "") // Remove inline code
                //     .replace(/[#*_~]/g, "") // Remove markdown symbols
                //     .replace(/\n+/g, " ") // Replace newlines with spaces
                //     .trim()
                //     .slice(0, 1000) // Limit content length

                const cleanContent = extractSearchText(mdxContent);

                // console.log("------");
                // console.log("Cleaned content: ");
                // console.log(cleanContent);
                // console.log("------");
                // Create a valid Meilisearch document ID. IDs may only contain
                // alphanumerics, hyphens and underscores, so sanitize every
                // other character (e.g. the period in locale-suffixed slugs
                // like "about.de" from about.de.mdx).
                const docId = slug.replace(/\//g, "-").replace(/[^a-zA-Z0-9_-]/g, "_")

                documents.push({
                    id: docId,
                    title: data.title || logicalSlug,
                    content: cleanContent,
                    slug: slug,
                    version: version,
                    locale: locale,
                    category: category,
                    tags: data.tags || [],
                    tab_group: tabGroup,
                })
            }
        }
    }

    // Process all version directories
    const versions = fs.readdirSync(docsDir).filter((item) => {
        const itemPath = path.join(docsDir, item)
        return fs.statSync(itemPath).isDirectory()
    })

    console.log(`Found ${versions.length} version(s):`, versions.join(", "))

    for (const version of versions) {
        const versionPath = path.join(docsDir, version)
        processDirectory(versionPath, version)
    }

    console.log(`Indexing ${documents.length} documents...`)

    try {
        // Configure searchable attributes first
        console.log("Configuring search settings...")
        await index.updateSearchableAttributes(["title", "content", "tags"])
        await index.updateFilterableAttributes(["version", "locale", "category", "tags"])
        await index.updateSortableAttributes(["title"])
        await index.updateDistinctAttribute("id")
        await index.updateSettings({
            rankingRules: [
                "words",
                "typo",
                "proximity",
                "attribute",
                "sort",
                "exactness"
            ]
        })
        console.log("✅ Search configuration updated!")

        // Delete existing documents
        console.log("Clearing old documents...")
        const deleteTask = await index.deleteAllDocuments()
        console.log("Delete task created:", deleteTask.taskUid)

        // Add new documents
        console.log("Adding documents...")
        const addTask = await index.addDocuments(documents, { primaryKey: "id" })
        console.log("Add task created:", addTask.taskUid)
        console.log("✅ Documents sent for indexing!")

        console.log("\n⏳ Indexing is processing in the background...")
        console.log("Wait a few seconds, then run 'npm run test:search' to verify!")
    } catch (error) {
        console.error("Error indexing documents:", error)
        if (error instanceof Error) {
            console.error("Error message:", error.message)
        }
        process.exit(1)
    }
}

indexDocuments()
