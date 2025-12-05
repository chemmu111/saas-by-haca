
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import User from './src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function generateToken() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne();
        if (user) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            fs.writeFileSync('token.txt', token);
            console.log('Token written to token.txt');
        } else {
            console.log('TOKEN:None');
        }
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

generateToken();
