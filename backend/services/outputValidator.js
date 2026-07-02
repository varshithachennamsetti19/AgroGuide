/**
 * Output Validator Service for AgroGuide
 * Scans generated replies to ensure safety, domain-compliance, and no harmful suggestions.
 */

import { detectLanguage } from './domainFirewall.js';

const SAFE_FALLBACKS = {
  'en-US': "I'm sorry, but I couldn't find reliable information for your question from the available agricultural knowledge base.",
  'te-IN': "క్షమించండి, అందుబాటులో ఉన్న వ్యవసాయ విజ్ఞాన సర్వస్వం నుండి మీ ప్రశ్నకు తగిన నమ్మకమైన సమాచారం లభించలేదు.",
  'hi-IN': "क्षमा करें, उपलब्ध कृषि ज्ञानकोश से आपके प्रश्न के लिए विश्वसनीय जानकारी नहीं मिल सकी।",
  'ta-IN': "மன்னிக்கவும், கிடைக்கக்கூடிய விவசாய அறிவுத் தளத்திலிருந்து உங்கள் கேள்விக்கான நம்பகமான தகவலைக் கண்டறிய முடியவில்லை."
};

/**
 * Validates a generated assistant reply.
 * @param {string} replyText - The raw assistant response text
 * @param {string} originalQuery - The user's query text
 * @returns {Object} { isValid: boolean, reason: string, reply: string }
 */
export const validateOutput = (replyText, originalQuery = '') => {
  if (!replyText) {
    const lang = detectLanguage(originalQuery);
    return { isValid: false, reason: 'empty', reply: SAFE_FALLBACKS[lang] || SAFE_FALLBACKS['en-US'] };
  }

  const text = replyText.toLowerCase();
  const lang = detectLanguage(originalQuery || replyText);

  // 1. Detect Programming/Coding jargon
  const programmingTerms = [
    'javascript', 'python', 'c++', 'java', 'programming', 'coding', 'html', 'css', 'sql injection',
    'developer', 'compile', 'scripting', 'source code', 'syntax error'
  ];
  for (const term of programmingTerms) {
    if (text.includes(term)) {
      return {
        isValid: false,
        reason: `out-of-domain terms: ${term}`,
        reply: SAFE_FALLBACKS[lang] || SAFE_FALLBACKS['en-US']
      };
    }
  }

  // 2. Detect Human Medical/Legal references
  const medicalLegalTerms = [
    'paracetamol', 'ibuprofen', 'aspirin', 'prescription', 'consult a medical doctor', 'pediatrician',
    'lawsuit', 'litigation', 'court case', 'legal advice', 'lawyer', 'attorney'
  ];
  for (const term of medicalLegalTerms) {
    if (text.includes(term)) {
      return {
        isValid: false,
        reason: `medical/legal advice: ${term}`,
        reply: SAFE_FALLBACKS[lang] || SAFE_FALLBACKS['en-US']
      };
    }
  }

  // 3. Detect Harmful/Banned Farming recommendations
  const harmfulFarmingTerms = [
    'ddt', 'endosulfan', 'paraquat', 'burn all crops', 'burn the field', 'overwater by flooding daily'
  ];
  for (const term of harmfulFarmingTerms) {
    if (text.includes(term)) {
      return {
        isValid: false,
        reason: `harmful agricultural advice: ${term}`,
        reply: SAFE_FALLBACKS[lang] || SAFE_FALLBACKS['en-US']
      };
    }
  }

  return { isValid: true, reply: replyText };
};
