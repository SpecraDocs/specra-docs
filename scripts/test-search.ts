import { MeiliSearch } from "meilisearch"
// Import from specra's server-safe module directly rather than the package
// barrel ("specra"), which is a Svelte library that pulls in `$app/*` virtuals
// that only resolve inside a Vite/SvelteKit build — not in a standalone tsx script.
import { getConfig, initConfig } from "../node_modules/specra/dist/config.server.js"
import specraConfig from "../specra.config.json"

async function testSearch() {
    initConfig(specraConfig as any)
    const config = getConfig()
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
    console.log("Using API Key:", meilisearchConfig.apiKey ? "Yes" : "No")

    const client = new MeiliSearch({
        host: meilisearchConfig.host,
        apiKey: meilisearchConfig.apiKey || "",
    })

    const index = client.index(meilisearchConfig.indexName)

    try {
        // Get index stats
        console.log("\n📊 Index Stats:")
        const stats = await index.getStats()
        console.log("- Number of documents:", stats.numberOfDocuments)
        console.log("- Is indexing:", stats.isIndexing)
        console.log("- Field distribution:", JSON.stringify(stats.fieldDistribution, null, 2))

        // Get some documents
        console.log("\n📄 Sample Documents:")
        const documents = await index.getDocuments({ limit: 3 })
        console.log("Total documents:", documents.results.length)
        documents.results.forEach((doc: any, i: number) => {
            console.log(`\nDocument ${i + 1}:`)
            console.log("- ID:", doc.id)
            console.log("- Title:", doc.title)
            console.log("- Version:", doc.version)
            console.log("- Slug:", doc.slug)
            console.log("- Category:", doc.category)
            console.log("- Content preview:", doc.content?.substring(0, 100) + "...")
        })

        // Test search
        console.log("\n🔍 Testing Search:")
        const searchQueries = ["documentation", "getting", "guide", "intro"]
        
        for (const query of searchQueries) {
            const results = await index.search(query, {
                limit: 5,
            })
            console.log(`\nQuery: "${query}"`)
            console.log(`- Results found: ${results.hits.length}`)
            console.log(`- Processing time: ${results.processingTimeMs}ms`)
            if (results.hits.length > 0) {
                console.log("- First result:", (results.hits[0] as any).title)
            }
        }

        // Get searchable attributes
        console.log("\n⚙️  Index Settings:")
        const searchableAttrs = await index.getSearchableAttributes()
        console.log("- Searchable attributes:", searchableAttrs)
        
        const filterableAttrs = await index.getFilterableAttributes()
        console.log("- Filterable attributes:", filterableAttrs)

    } catch (error) {
        console.error("\n❌ Error:", error)
        if (error instanceof Error) {
            console.error("Message:", error.message)
        }
    }
}

testSearch()
