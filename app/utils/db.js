// app/utils/db.js
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

if (!process.env.MONGODB_DB_NAME) {
  throw new Error("Please define the MONGODB_DB_NAME environment variable");
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;
let cachedClient = null;
let cachedDb = null;

/**
 * Connexion centralisée à MongoDB avec mise en cache
 * @returns {Promise<{client: MongoClient, db: Db}>}
 */
export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);
  
  cachedClient = client;
  cachedDb = db;
  
  return { client, db };
}
