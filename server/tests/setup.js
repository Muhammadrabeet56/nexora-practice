import mongoose from 'mongoose';
import '../src/models/Product.js';
import '../src/models/User.js';
import '../src/models/Sale.js';
import '../src/models/StockMovement.js';
import '../src/models/ReturnSale.js';
import '../src/models/Counter.js';

// CI passes MONGO_URL via workflow env (no shell quoting issues there).
// Locally we default to the single-node replica set on 127.0.0.1.
const TEST_URL =
  process.env.MONGO_URL ||
  'mongodb://127.0.0.1:27017/nexora-pos-test?replicaSet=rs0&directConnection=true';

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  await mongoose.connect(TEST_URL);
  await mongoose.connection.db.dropDatabase();
  // unique indexes must EXIST before duplicate tests run
  await mongoose.syncIndexes();
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
});
