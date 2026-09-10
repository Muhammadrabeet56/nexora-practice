import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  sku:  { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, default: 'general', trim: true },
  price: { type: Number, required: true, min: 0 },
  cost:  { type: Number, default: 0, min: 0 },
  qty:   { type: Number, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 5, min: 0 },
  supplier: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
