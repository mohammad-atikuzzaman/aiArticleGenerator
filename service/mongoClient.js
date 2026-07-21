import { MongoClient } from "mongodb";
import { config } from "../config/aiConfig.js";

let mongoClientPromise = null;

function requireMongoUri() {
  if (!config.mongodbUri) {
    throw new Error("MONGODB_URI is missing. Add it to your .env file.");
  }
}

export async function getMongoClient() {
  requireMongoUri();

  if (!mongoClientPromise) {
    const client = new MongoClient(config.mongodbUri, {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 0),
      serverSelectionTimeoutMS: Number(
        process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000
      ),
    });

    mongoClientPromise = client.connect();
  }

  return mongoClientPromise;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db(config.mongodbDbName);
}

export async function getMongoCollection(collectionName) {
  const db = await getMongoDb();
  return db.collection(collectionName);
}

export async function closeMongoClient() {
  if (mongoClientPromise) {
    const client = await mongoClientPromise;
    await client.close();
    mongoClientPromise = null;
  }
}
