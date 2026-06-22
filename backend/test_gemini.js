import { generateReply } from './services/gemini.js';

async function test() {
  try {
    console.log("Calling generateReply with 'హాయ్ హలో ఎలా ఉన్నారు?'...");
    const reply = await generateReply("హాయ్ హలో ఎలా ఉన్నారు?");
    console.log("SUCCESS! Reply:", reply);
  } catch (err) {
    console.error("FAILED! Error details:");
    console.error(err);
  }
}

test();
