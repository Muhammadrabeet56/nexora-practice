import mongoose from 'mongoose';

const ROLES = ['admin', 'manager', 'cashier'];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ROLES, default: 'cashier' },
}, { timestamps: true });

userSchema.statics.ROLES = ROLES;
export default mongoose.model('User', userSchema);
