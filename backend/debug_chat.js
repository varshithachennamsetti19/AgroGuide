import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import { generateAndSaveChat } from './controllers/chatController.js';

dotenv.config();

async function run() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Finding a registered user...");
    const user = await User.findOne({});
    if (!user) {
      console.log("ERROR: No registered user found in the database. Please register a user first.");
      process.exit(1);
    }
    console.log(`Found user: ${user.email} (${user._id})`);

    const req = {
      body: {
        message: "హాయ్ హలో ఎలా ఉన్నారు?",
        history: []
      },
      user: user
    };

    const res = {
      status(code) {
        return {
          json(data) {
            console.log(`Response Status: ${code}`);
            console.log("Response Data:", JSON.stringify(data, null, 2));
            mongoose.connection.close();
          }
        };
      }
    };

    console.log("Executing generateAndSaveChat...");
    await generateAndSaveChat(req, res);
  } catch (err) {
    console.error("CRITICAL RUNTIME ERROR:");
    console.error(err);
    mongoose.connection.close();
  }
}

run();
