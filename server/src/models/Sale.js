import mongoose from 'mongoose';

// Sale lines snapshot sku/name/price/cost at time of sale (audit-grade).
const saleSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  lineItems: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: String, name: String,
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, default: 0 },
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'mobile'], default: 'cash' },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['COMPLETED', 'RETURNED'], default: 'COMPLETED' },
}, { timestamps: true });

saleSchema.index({ createdAt: -1 });

export default mongoose.model('Sale', saleSchema);
