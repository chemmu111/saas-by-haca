
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Client from './src/models/Client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function getClient() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const clients = await Client.find();
    clients.forEach(c => {
      console.log(`ID: ${c._id} | Name: ${c.name}`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

getClient();
