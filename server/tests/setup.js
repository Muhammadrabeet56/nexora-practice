import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import '../src/models/Product.js';
import '../src/models/User.js';
import '../src/models/Sale.js';
import '../src/models/StockMovement.js';
import '../src/models/ReturnSale.js';
import '../src/models/Counter.js';

let mongo;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  if (process.env.MONGO_URL) {
    await mongoose.connect(process.env.MONGO_URL);
    await mongoose.connection.db.dropDatabase();
    // unique indexes must EXIST before duplicate tests run — build them now
    await mongoose.syncIndexes();
    return;
  }
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await mongoose.syncIndexes();
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
