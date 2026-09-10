// Seed: first admin + demo staff + demo products.
// Run ONCE per fresh DB:  npm run seed
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Product from './models/Product.js';
import StockMovement from './models/StockMovement.js';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/nexora-pos';

await mongoose.connect(MONGO_URL);

if (await User.countDocuments() > 0) {
  console.log('Users exist — seeding skipped (safe to run only once).');
  process.exit(0);
}

const PASSWORDS = { admin: 'admin123', manager: 'manager123', cashier: 'cashier123' };
async function mk(name, email, role) {
  return User.create({
    name, email, role,
    passwordHash: await bcrypt.hash(PASSWORDS[role], 10),
  });
}

await mk('Muhammad Rabeet', 'admin@nexora.com', 'admin');
await mk('Sarah Manager', 'manager@nexora.com', 'manager');
await mk('Carl Cashier', 'cashier@nexora.com', 'cashier');

const admin = await User.findOne({ email: 'admin@nexora.com' });

const products = [
  ['NXC-001', 'Nexora Notebook A5', 'stationery', 4.5, 2.1, 120, 20, 'PaperCo'],
  ['NXC-002', 'Gel Pen Blue', 'stationery', 1.2, 0.4, 300, 50, 'PaperCo'],
  ['NXC-003', 'Coffee Beans 250g', 'grocery', 8.99, 5.2, 40, 10, 'BeanCorp'],
  ['NXC-004', 'Green Tea 100 bags', 'grocery', 5.5, 2.8, 8, 10, 'BeanCorp'],
  ['NXC-005', 'USB-C Cable 1m', 'electronics', 9.99, 3.5, 65, 15, 'TechSup'],
  ['NXC-006', 'Phone Stand', 'electronics', 12.0, 5.0, 3, 5, 'TechSup'],
  ['NXC-007', 'Hand Sanitizer 100ml', 'health', 3.25, 1.1, 80, 25, 'CleanPlus'],
  ['NXC-008', 'Face Tissue Box', 'health', 2.0, 0.9, 2, 10, 'CleanPlus'],
];

for (const [sku, name, category, price, cost, qty, reorderLevel, supplier] of products) {
  const p = await Product.create({ sku, name, category, price, cost, qty, reorderLevel, supplier });
  await StockMovement.create({
    product: p._id, delta: qty, kind: 'RECEIVE',
    ref: 'seed', by: admin._id, note: 'opening stock',
  });
}

console.log('Seeded: 3 users + 8 products. Logins:');
console.log('  admin@nexora.com   / admin123');
console.log('  manager@nexora.com / manager123');
console.log('  cashier@nexora.com / cashier123');
process.exit(0);
