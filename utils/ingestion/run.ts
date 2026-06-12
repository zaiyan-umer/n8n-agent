import { loadEnvConfig } from "@next/env";
// Load Next.js environment variables (.env, .env.local, etc.)
loadEnvConfig(process.cwd());

import fs from "fs";
import path from "path";
import { db } from "../../db/connection";
import { nodeChunks } from "../../db/schema/node_chunks";
import { chunkByOperation } from "./fetchAndGenerateChunks";
import { generateChunksEmbeddings } from "./generateEmbeddings";
import { storeGeneratedEmbeddings } from "./storeEmbeddings";
import { EmbedChunk } from "./types";

/**
 * Orchestrates the full node ingestion pipeline:
 * 1. Reads raw n8n nodes metadata from n8n_nodes.json.
 * 2. Parses and groups node properties by operation chunks.
 * 3. Generates high-dimensional embedding vectors using Google's text-embedding-004.
 * 4. Persists the embeddings to PostgreSQL using Drizzle ORM.
 */

export async function runIngestion(): Promise<void> {
	let filePath = path.join(__dirname, "n8n_nodes.json");

	if (!fs.existsSync(filePath)) {
		throw new Error(`n8n_nodes.json not found at ${filePath} or root workspace`);
	}

	console.log(`[Ingestion] Loading nodes from: ${filePath}`);
	const rawData = fs.readFileSync(filePath, "utf8");
	const rawNodes = JSON.parse(rawData);

	console.log(`[Ingestion] Parsing and chunking ${rawNodes.length} nodes...`);
	const chunks: EmbedChunk[] = [];

	for (const item of rawNodes) {
		const attr = item.attributes;
		if (!attr || attr.hidden) {
			continue;
		}

		const node = {
			nodeType: attr.name,
			displayName: attr.displayName,
			description: attr.description,
			properties: attr.properties?.data || attr.properties || [],
		};

		if (!node.nodeType || !node.displayName) {
			continue;
		}

		const nodeChunks = chunkByOperation(node);
		chunks.push(...nodeChunks);
	}

	console.log(`[Ingestion] Generated ${chunks.length} total chunks.`);

	console.log(`[Ingestion] Fetching existing chunk IDs from database...`);
	let existingIds = new Set<string>();

	try {
		const existingRecords = await db.select({ id: nodeChunks.id }).from(nodeChunks);
		existingIds = new Set(existingRecords.map((r) => r.id));
		console.log(`[Ingestion] Found ${existingIds.size} existing chunks in the database.`);
		
	} catch (err) {
		console.warn(`[Ingestion] Could not fetch existing chunks (table might be empty or not created yet).`);
	}

	const newChunks = chunks.filter((c) => !existingIds.has(c.id));
	console.log(`[Ingestion] ${newChunks.length} new chunks need embeddings.`);

	if (newChunks.length === 0) {
		console.log(`[Ingestion] All chunks are already embedded and stored!`);
		return;
	}

	console.log(`[Ingestion] Generating embeddings and storing in batches...`);
	const batchSize = 100;
	for (let i = 0; i < newChunks.length; i += batchSize) {
		const batch = newChunks.slice(i, i + batchSize);
		console.log(
			`[Ingestion] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
				newChunks.length / batchSize
			)} (${batch.length} chunks)...`
		);

		const embeddedBatch = await generateChunksEmbeddings(batch);

		console.log(`[Ingestion] Storing batch to database...`);
		await storeGeneratedEmbeddings(embeddedBatch);
	}

	console.log(`[Ingestion] Node vectorization completed successfully!`);
}

// Execute pipeline when run directly
if (require.main === module) {
	runIngestion()
		.then(() => {
			console.log("[Ingestion] Done!");
			process.exit(0);
		})
		.catch((err) => {
			console.error("[Ingestion] Failed:", err);
			process.exit(1);
		});
}
