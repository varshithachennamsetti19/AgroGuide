import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Classifies the query using regex rules. Returns null if no rule matches.
 */
function classifyWithRules(message) {
  const msg = message.toLowerCase().trim();

  // 1. Insurance Check
  if (
    msg.includes('insurance') || msg.includes('bima') || msg.includes('claim') || msg.includes('fasal bima') ||
    msg.includes('భీమా') || msg.includes('ఇన్సూరెన్స్') ||
    msg.includes('बीमा') || msg.includes('फसल बीमा') ||
    msg.includes('காப்பீடு')
  ) {
    return 'INSURANCE_QUERY';
  }

  // 2. Loan Check
  if (
    msg.includes('loan') || msg.includes('credit card') || msg.includes('kcc') || msg.includes('debt') || msg.includes('interest') ||
    msg.includes('రుణం') || msg.includes('రుణాలు') || msg.includes('అప్పు') || msg.includes('వడ్డీ') ||
    msg.includes('ऋण') || msg.includes('कर्ज') || msg.includes('ब्याज') ||
    msg.includes('கடன்')
  ) {
    return 'LOAN_QUERY';
  }

  // 3. Scheme Check
  if (
    msg.includes('pm kisan') || msg.includes('rythu bharosa') || msg.includes('scheme') || msg.includes('yojana') || msg.includes('subsidy') ||
    msg.includes('పథకం') || msg.includes('పథకాలు') || msg.includes('భరోసా') ||
    msg.includes('योजना') || msg.includes('अनुदान') ||
    msg.includes('திட்டம்') || msg.includes('திட்டங்கள்') || msg.includes('மானியம்')
  ) {
    return 'SCHEME_QUERY';
  }

  // 4. Disease Check
  if (
    msg.includes('disease') || msg.includes('yellow spots') || msg.includes('wilting') || msg.includes('fungal') || msg.includes('blight') || msg.includes('rot') || msg.includes('spots') ||
    msg.includes('తెగులు') || msg.includes('తెగుళ్ళు') || msg.includes('కుళ్లు') ||
    msg.includes('बीमारी') || msg.includes('रोग') || msg.includes('सड़न') || msg.includes('पीला धब्बा') ||
    msg.includes('நோய்') || msg.includes('நோய்கள்') || msg.includes('அழுகல்')
  ) {
    return 'DISEASE_QUERY';
  }

  // 5. Pest Check
  if (
    msg.includes('pest') || msg.includes('insect') || msg.includes('worm') || msg.includes('pesticide') || msg.includes('insecticide') || msg.includes('caterpillar') || msg.includes('bug') ||
    msg.includes('పురుగు') || msg.includes('పురుగులు') || msg.includes('కీటక') || msg.includes('పురుగుల మందు') ||
    msg.includes('कीट') || msg.includes('कीड़ा') || msg.includes('कीटनाशक') ||
    msg.includes('பூச்சி') || msg.includes('பூச்சிகள்') || msg.includes('பூச்சிக்கொல்லி')
  ) {
    return 'PEST_QUERY';
  }

  // 6. Fertilizer Check
  if (
    msg.includes('fertilizer') || msg.includes('urea') || msg.includes('potash') || msg.includes('manure') || msg.includes('compost') || msg.includes('phosphate') || msg.includes('nitrogen') || msg.includes('npk') ||
    msg.includes('ఎరువు') || msg.includes('ఎరువులు') || msg.includes('యూరియా') ||
    msg.includes('खाद') || msg.includes('उर्वरक') || msg.includes('यूरिया') ||
    msg.includes('உரம்') || msg.includes('உரங்கள்') || msg.includes('யூரியோ')
  ) {
    return 'FERTILIZER_QUERY';
  }

  // 7. Irrigation Check
  if (
    msg.includes('irrigation') || msg.includes('watering') || msg.includes('drip') || msg.includes('sprinkler') || msg.includes('borewell') || msg.includes('canal') || msg.includes('pump') ||
    msg.includes('నీటి పారుదల') || msg.includes('నీరు పెట్టడం') || msg.includes('డ్రిప్') || msg.includes('స్పింక్లర్') ||
    msg.includes('सिंचाई') || msg.includes('सिंचन') || msg.includes('टपकन') ||
    msg.includes('பாசனம்') || msg.includes('சொட்டுநீர்')
  ) {
    return 'IRRIGATION_QUERY';
  }

  // 8. Soil Check
  if (
    msg.includes('soil') || msg.includes('sand') || msg.includes('clay') || msg.includes('loamy') || msg.includes('soil health') || msg.includes('earth') || msg.includes('acidic') || msg.includes('alkaline') || msg.includes('ph') ||
    msg.includes('నేల') || msg.includes('మట్టి') || msg.includes('నేల పరీక్ష') ||
    msg.includes('मिट्टी') || msg.includes('मृदा') ||
    msg.includes('மண்') || msg.includes('மண் பரிசோதனை')
  ) {
    return 'SOIL_QUERY';
  }

  // 9. Market Check
  if (
    msg.includes('market price') || msg.includes('mandi') || msg.includes('price') || msg.includes('prices') || msg.includes('msp') || msg.includes('rate') ||
    msg.includes('మార్కెట్ ధర') || msg.includes('ధర') || msg.includes('ధరలు') ||
    msg.includes('बाजार भाव') || msg.includes('मंडी भाव') || msg.includes('कीमत') || msg.includes('दाम') ||
    msg.includes('சந்தை விலை') || msg.includes('விலை')
  ) {
    return 'MARKET_QUERY';
  }

  // 10. Livestock Check
  if (
    msg.includes('livestock') || msg.includes('cow') || msg.includes('cows') || msg.includes('buffalo') || msg.includes('goat') || msg.includes('sheep') || msg.includes('poultry') || msg.includes('cattle') || msg.includes('dairy') || msg.includes('animal') ||
    msg.includes('పశువులు') || msg.includes('ఆవు') || msg.includes('గేదె') || msg.includes('మేక') || msg.includes('గొర్రె') || msg.includes('కోళ్లు') ||
    msg.includes('पशुधन') || msg.includes('गाय') || msg.includes('भैंस') || msg.includes('बकरी') || msg.includes('भेड़') || msg.includes('मुर्गीपालन') ||
    msg.includes('கால்நடை') || msg.includes('பசு') || msg.includes('எருமை') || msg.includes('ஆடு') || msg.includes('கோழி')
  ) {
    return 'LIVESTOCK_QUERY';
  }

  // 11. Weather Check
  if (
    msg.includes('weather') || msg.includes('forecast') || msg.includes('rain') || msg.includes('monsoon') || msg.includes('temperature') || msg.includes('temp') || msg.includes('humidity') || msg.includes('aqi') || msg.includes('sunrise') || msg.includes('sunset') ||
    msg.includes('వాతావరణం') || msg.includes('వర్షం') || msg.includes('కురుస్తుంది') || msg.includes('ఉష్ణోగ్రత') ||
    msg.includes('मौसम') || msg.includes('बारिश') || msg.includes('वर्षा') || msg.includes('तापमान') ||
    msg.includes('வானிலை') || msg.includes('மழை')
  ) {
    return 'WEATHER_QUERY';
  }

  // 12. Crop Check
  if (
    msg.includes('rice') || msg.includes('cotton') || msg.includes('maize') || msg.includes('groundnut') || msg.includes('tomato') || msg.includes('sugarcane') || msg.includes('chilli') || msg.includes('wheat') || msg.includes('sowing') || msg.includes('harvest') || msg.includes('cultivation') ||
    msg.includes('వరి') || msg.includes('ప్రత్తి') || msg.includes('మొక్కజొన్న') || msg.includes('వేరుశనగ') || msg.includes('టమోటా') || msg.includes('చెరకు') || msg.includes('నాట్లు') || msg.includes('సాగు') ||
    msg.includes('धान') || msg.includes('कपास') || msg.includes('मक्का') || msg.includes('मूंगफली') || msg.includes('टमाटर') || msg.includes('गन्ना') ||
    msg.includes('நெல்') || msg.includes('பருத்தி') || msg.includes('சோளம்') || msg.includes('நிலக்கடலை') || msg.includes('தக்காளி') || msg.includes('கரும்பு')
  ) {
    return 'CROP_QUERY';
  }

  // 13. General Greetings / Identity (mapped to GENERAL_AGRICULTURE)
  if (
    msg.includes('hello') || msg.includes('hi') || msg.includes('namaste') || msg.includes('who are you') || msg.includes('your name') || msg.includes('how are you') ||
    msg.includes('హలో') || msg.includes('నమస్కారం') ||
    msg.includes('नमस्ते') || msg.includes('प्रणाम') ||
    msg.includes('வணக்கம்')
  ) {
    return 'GENERAL_AGRICULTURE';
  }

  return null;
}

// Predefined list of known cities for fast lookup (in English, Telugu, and Hindi)
const CITY_MAPPING = [
  { en: 'Vijayawada', te: 'విజయవాడ', hi: 'विजयवाड़ा' },
  { en: 'Hyderabad', te: 'హైదరాబాద్', hi: 'हैदराबाद' },
  { en: 'Guntur', te: 'గుంటూరు', hi: 'गुंटूर' },
  { en: 'Nellore', te: 'నెల్లూరు', hi: 'नेलोर' },
  { en: 'Visakhapatnam', te: 'విశాఖపట్నం', hi: 'विशाखापत्तनम' },
  { en: 'Kurnool', te: 'కర్నూలు', hi: 'कर्नूल' },
  { en: 'Tirupati', te: 'తిరుపతి', hi: 'तिरुपति' },
  { en: 'Warangal', te: 'వరంగల్', hi: 'वारंगल' },
  { en: 'Delhi', te: 'ఢిల్లీ', hi: 'दिल्ली' },
  { en: 'Mumbai', te: 'ముంబై', hi: 'मुंबई' },
  { en: 'Bangalore', te: 'బెంగళూరు', hi: 'बैंगलोर' },
  { en: 'Bengaluru', te: 'బెంగళూరు', hi: 'बेंगलुरु' },
  { en: 'Chennai', te: 'చెన్నై', hi: 'चेन्नई' }
];

export function extractCity(message) {
  if (!message) return null;
  const msg = message.toLowerCase().trim();

  for (const cityObj of CITY_MAPPING) {
    if (msg.includes(cityObj.en.toLowerCase())) {
      return cityObj.en;
    }
    if (msg.includes(cityObj.te) || msg.includes(cityObj.te + 'లో')) {
      return cityObj.en;
    }
    if (msg.includes(cityObj.hi)) {
      return cityObj.en;
    }
  }

  const englishPatterns = [
    /\bin\s+([a-zA-Z\s]+)/i,
    /\bat\s+([a-zA-Z\s]+)/i,
    /\bof\s+([a-zA-Z\s]+)/i,
    /([a-zA-Z\s]+)\s+weather/i,
    /([a-zA-Z\s]+)\s+forecast/i
  ];

  for (const pattern of englishPatterns) {
    const match = msg.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim().split(/\s+/)[0];
      const stopWords = ['today', 'tomorrow', 'this', 'the', 'my', 'your', 'his', 'her', 'a', 'an'];
      if (!stopWords.includes(candidate) && candidate.length > 2) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  return null;
}

export function detectQueryTime(message) {
  if (!message) return 'current';
  const msg = message.toLowerCase();
  
  if (
    msg.includes('tomorrow') ||
    msg.includes('forecast') ||
    msg.includes('5 day') ||
    msg.includes('next week') ||
    msg.includes('రేపు') ||
    msg.includes('ముందు చూపు') ||
    msg.includes('कल') ||
    msg.includes('पूर्वानुमान')
  ) {
    return 'forecast';
  }
  
  return 'current';
}

export function isSeasonalQuery(message) {
  if (!message) return false;
  const msg = message.toLowerCase();
  return (
    msg.includes('monsoon') ||
    msg.includes('seasonal') ||
    msg.includes('yearly') ||
    msg.includes('annual') ||
    msg.includes('this year') ||
    msg.includes('year\'s rain') ||
    msg.includes('వర్షాలు') ||
    msg.includes('ఈ సంవత్సరం') ||
    msg.includes('ఈ ఏడాది') ||
    msg.includes('వర్షపాతం') ||
    msg.includes('వర్షాకాలం') ||
    msg.includes('इस साल') ||
    msg.includes('बारिश कैसी') ||
    msg.includes('सालाना') ||
    msg.includes('मानसून')
  );
}

const STATE_MAPPING = [
  { en: 'Andhra Pradesh', aliases: ['andhra pradesh', 'andhra', 'ap', 'ఆంధ్ర ప్రదేశ్', 'ఆంధ్రప్రదేశ్', 'ఆంధ్ర', 'आंध्र प्रदेश', 'आंध्र'] },
  { en: 'Telangana', aliases: ['telangana', 'ts', 'తెలంగాణ', 'తెలంగాణలో', 'तेलंगाना'] },
  { en: 'Maharashtra', aliases: ['maharashtra', 'మహారాష్ట్ర', 'महाराष्ट्र', 'महारष्ट्र'] },
  { en: 'Karnataka', aliases: ['karnataka', 'కర్ణాటక', 'कर्नाटक', 'कर्नाटका'] },
  { en: 'Tamil Nadu', aliases: ['tamil nadu', 'tamilnadu', 'తమిళనాడు', 'तमिलनाडु', 'तमिल नाडु'] },
  { en: 'Uttar Pradesh', aliases: ['uttar pradesh', 'up', 'ఉత్తర ప్రదేశ్', 'उत्तर प्रदेश', 'यूपी'] },
  { en: 'Punjab', aliases: ['punjab', 'పంజాబ్', 'पंजाब'] }
];

export function extractState(message) {
  if (!message) return null;
  const msg = message.toLowerCase().trim();

  for (const stateObj of STATE_MAPPING) {
    for (const alias of stateObj.aliases) {
      if (msg.includes(alias)) {
        return stateObj.en;
      }
    }
  }

  const statePatterns = [
    /state\s+of\s+([a-zA-Z\s]+)/i,
    /in\s+([a-zA-Z\s]+)/i,
    /([a-zA-Z\s]+)\s+monsoon/i
  ];

  for (const pattern of statePatterns) {
    const match = msg.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim().split(/\s+/)[0];
      for (const stateObj of STATE_MAPPING) {
        if (stateObj.en.toLowerCase().includes(candidate.toLowerCase()) && candidate.length > 3) {
          return stateObj.en;
        }
      }
    }
  }

  return null;
}

/**
 * Route the user request to determine the appropriate intent
 * @param {string} message - User query text
 * @returns {Promise<string>} Classified Intent label
 */
export async function detectIntent(message) {
  // 1. Fast rules-based check
  const ruleIntent = classifyWithRules(message);
  if (ruleIntent) {
    console.log(`🤖 Intent Router: Rules-based match: ${ruleIntent} for "${message}"`);
    return ruleIntent;
  }

  // 2. Fallback to Gemini classifier
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 50,
        temperature: 0.1,
      }
    });

    const classificationPrompt = `
You are an intent classifier for AgroGuide, a smart agricultural chatbot.
Categorize the incoming user query into exactly one of these categories:
- SCHEME_QUERY: Government schemes, subsidies, PM Kisan, Rythu Bharosa, benefits.
- CROP_QUERY: Planting details, sowing seasons, spacing, yields, crop guides.
- WEATHER_QUERY: Forecasts, rain conditions, temperatures, humidity, monsoon reports.
- SOIL_QUERY: Soil quality, testing, pH values, soil types.
- IRRIGATION_QUERY: Drip irrigation, sprinkler systems, watering schedules.
- FERTILIZER_QUERY: Fertilizer schedules, urea, NPK ratio, organic manure.
- PEST_QUERY: Pests, insects, caterpillars, pesticide treatments.
- DISEASE_QUERY: Plant diseases, leaf spots, wilting, fungicide control.
- MARKET_QUERY: Market rates, crop selling prices, mandi prices, MSP.
- LIVESTOCK_QUERY: Cattle care, cow/buffalo health, milk yield, poultry, goat farming.
- LOAN_QUERY: Agricultural loans, bank credit, KCC schemes.
- INSURANCE_QUERY: Crop insurance, PM Fasal Bima claims.
- GENERAL_AGRICULTURE: Greetings, greetings in local languages, identity checks ("who are you").
- OUT_OF_SCOPE: Queries completely unrelated to agriculture, weather, or farming.
- UNKNOWN: Ambiguous/unclear queries.

Respond with ONLY the category name. Do not write any other words.

User Query: "${message}"

Category:`;

    const result = await model.generateContent(classificationPrompt);
    const response = await result.response;
    const cleanedIntent = response.text().trim().toUpperCase();

    const validIntents = [
      'SCHEME_QUERY', 'CROP_QUERY', 'WEATHER_QUERY', 'SOIL_QUERY',
      'IRRIGATION_QUERY', 'FERTILIZER_QUERY', 'PEST_QUERY', 'DISEASE_QUERY',
      'MARKET_QUERY', 'LIVESTOCK_QUERY', 'LOAN_QUERY', 'INSURANCE_QUERY',
      'GENERAL_AGRICULTURE', 'OUT_OF_SCOPE', 'UNKNOWN'
    ];
    if (validIntents.includes(cleanedIntent)) {
      console.log(`🤖 Intent Router: Gemini match: ${cleanedIntent} for "${message}"`);
      return cleanedIntent;
    }
  } catch (error) {
    console.error("Intent Router error:", error);
  }

  console.log(`🤖 Intent Router: Fallback to UNKNOWN for "${message}"`);
  return 'UNKNOWN';
}
