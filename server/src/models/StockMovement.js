import mongoose from 'mongoose';

// The accountability ledger: every stock change ever, attributed.
const movementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  delta: { type: Number, required: true },              // signed: -2 sold, +3 received
  kind: { type: String, enum: ['SALE', 'RETURN', 'ADJUST', 'RECEIVE'], required: true },
  ref: { type: String, default: '' },                   // sale number / note ref
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('StockMovement', movementSchema);
