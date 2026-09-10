import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/nexora-pos';
const PORT = process.env.PORT || 4000;

await mongoose.connect(MONGO_URL);
console.log('Mongo connected');
createApp().listen(PORT, () => console.log(`API on :${PORT}`));
