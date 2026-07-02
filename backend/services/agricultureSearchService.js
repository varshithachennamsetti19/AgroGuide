/**
 * Agriculture Search Service for AgroGuide
 * Restricts query searches to trusted agricultural portals and extracts whitelisted data.
 */

import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('data/agricultural_search_db.json');

// Whitelisted sites definitions
export const WHITELISTED_DOMAINS = [
  { name: 'Indian Council of Agricultural Research (ICAR)', url: 'https://icar.org.in' },
  { name: 'Ministry of Agriculture & Farmers Welfare', url: 'https://farmer.gov.in' },
  { name: 'Department of Agriculture & Cooperation', url: 'https://agricoop.nic.in' },
  { name: 'Agmarknet Mandi Portal', url: 'https://agmarknet.gov.in' },
  { name: 'PM Kisan Samman Nidhi', url: 'https://pmkisan.gov.in' },
  { name: 'mKisan Portal', url: 'https://mkisan.gov.in' },
  { name: 'Soil Health Card Portal', url: 'https://soilhealth.dac.gov.in' },
  { name: 'Indian Meteorological Department (IMD)', url: 'https://imd.gov.in' },
  { name: 'AgriMachinery Portal', url: 'https://agrimachinery.nic.in' }
];

// Multilingual translations map for internal query routing
const TRANSLATION_MAP = {
  // Telugu
  'టమాటా': 'tomato',
  'టమోటా': 'tomato',
  'టమాట': 'tomato',
  'వరి': 'rice',
  'బియ్యం': 'rice',
  'ప్రత్తి': 'cotton',
  'పత్తి': 'cotton',
  'మొక్కజొన్న': 'maize',
  'వేరుశనగ': 'groundnut',
  'చెరకు': 'sugarcane',
  'ధర': 'price',
  'ధరలు': 'price',
  'రేటు': 'price',
  'మార్కెట్': 'market',
  'సహాయం': 'help',
  'పథకం': 'scheme',
  
  // Hindi
  'टमाटर': 'tomato',
  'धान': 'rice',
  'चावल': 'rice',
  'कपास': 'cotton',
  'मक्का': 'maize',
  'मूंगफली': 'groundnut',
  'गन्ना': 'sugarcane',
  'भाव': 'price',
  'दाम': 'price',
  'मूल्य': 'price',
  'कीमत': 'price',
  'मंडी': 'market',
  'योजना': 'scheme',

  // Tamil
  'தக்காளி': 'tomato',
  'நெல்': 'rice',
  'அரிசி': 'rice',
  'பருத்தி': 'cotton',
  'சோளம்': 'maize',
  'நிலக்கடலை': 'groundnut',
  'கரும்பு': 'sugarcane',
  'விலை': 'price',
  'மதிப்பு': 'price',
  'சந்தை': 'market',
  'திட்டம்': 'scheme'
};

/**
 * Translates local language crop/mandi queries to standard English terms
 */
export function translateQuery(query) {
  if (!query) return '';
  let cleaned = query.toLowerCase();
  
  // Replace matching terms
  for (const [key, val] of Object.entries(TRANSLATION_MAP)) {
    if (cleaned.includes(key)) {
      cleaned = cleaned.replace(new RegExp(key, 'g'), val);
    }
  }
  return cleaned;
}

/**
 * Searches trusted agricultural sources for in-scope data.
 * @param {string} queryText - User's question
 * @returns {Promise<Object>} { success: boolean, results: Array, sources: Array }
 */
export async function searchAgriculturePortal(queryText) {
  const translated = translateQuery(queryText);
  console.log(`🔍 Search Engine: Original: "${queryText}" | Translated: "${translated}"`);

  let db = { mandiPrices: [], historicalPrices: {}, whitelistedArticles: [] };
  try {
    if (fs.existsSync(DB_PATH)) {
      db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read search DB:', err);
  }

  const results = [];
  const sources = [];

  const tokens = translated.split(/\W+/).filter(t => t.length > 2);
  const isMandiQuery = tokens.some(t => ['price', 'mandi', 'rate', 'cost', 'prices', 'market'].includes(t));

  // 1. Mandi Prices search flow
  if (isMandiQuery) {
    // Identify Crop
    const targetCrop = tokens.find(t => ['tomato', 'rice', 'cotton', 'maize', 'groundnut', 'sugarcane'].includes(t));
    if (targetCrop) {
      const cropNameCap = targetCrop.charAt(0).toUpperCase() + targetCrop.slice(1);
      const matches = db.mandiPrices.filter(item => item.crop.toLowerCase() === targetCrop);
      
      if (matches.length > 0) {
        // Collect all matches
        const contentStr = matches.map(m => 
          `At ${m.market}, ${m.crop} price is Rs. ${m.price} per ${m.unit} (Previous: Rs. ${m.previousPrice}, Change: Rs. ${m.change}) on date ${m.date}.`
        ).join(' ');

        results.push({
          title: `Live ${cropNameCap} Mandi Prices`,
          content: contentStr,
          sourceName: 'Agmarknet Mandi Portal',
          url: 'https://agmarknet.gov.in/Search/mandi-rates',
          confidenceScore: 98,
          publishedDate: new Date().toISOString().split('T')[0]
        });

        sources.push({
          sourceName: 'Agmarknet Mandi Portal',
          url: 'https://agmarknet.gov.in/Search/mandi-rates',
          publishedDate: new Date(),
          retrievedTime: new Date(),
          confidenceScore: 98
        });
      }
    }
  }

  // 2. Guidelines & General Whitelisted articles search flow
  db.whitelistedArticles.forEach(article => {
    let score = 0;
    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();

    tokens.forEach(token => {
      if (titleLower.includes(token)) score += 5;
      if (contentLower.includes(token)) score += 2;
    });

    if (score > 1) {
      results.push({
        title: article.title,
        content: article.content,
        sourceName: article.sourceName,
        url: article.url,
        confidenceScore: 95,
        publishedDate: article.publishedDate
      });

      // Avoid duplicate sources listing
      if (!sources.some(s => s.url === article.url)) {
        sources.push({
          sourceName: article.sourceName,
          url: article.url,
          publishedDate: new Date(article.publishedDate),
          retrievedTime: new Date(),
          confidenceScore: 95
        });
      }
    }
  });

  // Sort results by confidence
  results.sort((a, b) => b.confidenceScore - a.confidenceScore);

  return {
    success: results.length > 0,
    results,
    sources
  };
}
