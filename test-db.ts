import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { Client } from "pg";

async function testConnection() {
    console.log("Testing connection to:", process.env.DATABASE_URL);
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log("Connected successfully!");
        const res = await client.query("SELECT current_database();");
        console.log("Current DB:", res.rows[0]);
        await client.end();
    } catch (err) {
        console.error("Connection failed:", err);
    }
}

testConnection();
