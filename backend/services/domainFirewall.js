/**
 * Domain Firewall Service for AgroGuide
 * Protects against prompt injection attacks and out-of-scope queries in English, Telugu, Hindi, and Tamil.
 */

// Detect query language based on unicode characters
export const detectLanguage = (text) => {
  if (!text) return 'en-US';
  if (/[\u0c00-\u0c7f]/i.test(text)) {
    return 'te-IN'; // Telugu
  }
  if (/[\u0900-\u097f]/i.test(text)) {
    return 'hi-IN'; // Hindi
  }
  if (/[\u0b80-\u0bff]/i.test(text)) {
    return 'ta-IN'; // Tamil
  }
  return 'en-US'; // Default to English
};

// Prompt injection keywords to block
const PROMPT_INJECTION_KEYWORDS = [
  'ignore previous instructions',
  'ignore your instructions',
  'ignore instructions',
  'you are chatgpt',
  'forget your rules',
  'forget instructions',
  'reveal your system prompt',
  'act as another ai',
  'disable safety',
  'forget your instructions',
  'override safety',
  'system override',
  'ignore rules',
  'ignore your rules',
  'bypass safety',
  'reveal system prompt',
  'reveal developer instructions',
  'act as chatgpt',
  'jailbreak'
];


// Localized domain-specific error responses
const BLOCKED_RESPONSES = {
  'en-US': "I'm AgroGuide, an AI assistant designed to help farmers with agriculture, crops, weather, government schemes, and related farming topics. I can't answer questions outside this domain.",
  'te-IN': "నేను అగ్రోగైడ్, వ్యవసాయం, పంటలు, వాతావరణం, ప్రభుత్వ పథకాలు మరియు సంబంధిత వ్యవసాయ అంశాలతో రైతులకు సహాయం చేయడానికి రూపొందించబడిన ఒక AI సహాయకుడిని. నేను ఈ పరిధికి వెలుపల ఉన్న ప్రశ్నలకు సమాధానం ఇవ్వలేను.",
  'hi-IN': "मैं एग्रोगाइड हूँ, एक एआई सहायक जो किसानों को कृषि, फसलों, मौसम, सरकारी योजनाओं और संबंधित खेती के विषयों में मदद करने के लिए डिज़ाइन किया गया है। मैं इस क्षेत्र के बाहर के प्रश्नों का उत्तर नहीं दे सकता।",
  'ta-IN': "நான் அக்ரோகைடு, விவசாயிகள் விவசாயம், பயிர்கள், வானிலை, அரசு திட்டங்கள் மற்றும் அது சார்ந்த விவசாய தலைப்புகளில் உதவி செய்வதற்காக வடிவமைக்கப்பட்ட ஒரு AI உதவியாளர். இந்த டொமைனுக்கு அப்பாற்பட்ட கேள்விகளுக்கு என்னால் பதிலளிக்க முடியாது."
};

// Comprehensive list of agricultural/farming roots in English, Telugu, Hindi, and Tamil
const AGRI_KEYWORDS = [
  // --- English Keywords ---
  'farm', 'agri', 'crop', 'weather', 'rain', 'monsoon', 'soil', 'seed', 'fertiliz', 'irriga', 'pest', 'disease',
  'livestock', 'tractor', 'market price', 'insurance', 'loan', 'subsidy', 'kisan', 'yojana', 'harvest',
  'sow', 'cultivat', 'water', 'pesticide', 'insecticide', 'cow', 'buffalo', 'poultry', 'dairy', 'sheep',
  'goat', 'urea', 'potash', 'nitrogen', 'npk', 'compost', 'manure', 'drainage', 'borewell', 'drip',
  'sprinkler', 'rice', 'paddy', 'cotton', 'maize', 'groundnut', 'tomato', 'sugarcane', 'chilli', 'wheat',
  'vegetable', 'yield', 'mandi', 'rythu', 'bharosa', 'scheme', 'weed', 'plow', 'plough', 'poultry', 'pasture',
  'veterinary', 'cattle', 'hen', 'chicken', 'fruit', 'planting', 'cultivation', 'fungicide',

  // --- Telugu Keywords (వ్యవసాయ పదాలు) ---
  'వ్యవసాయం', 'వ్యవసాయ', 'పంట', 'నేల', 'మట్టి', 'విత్తనం', 'విత్తనాలు', 'ఎరువు', 'నీటి పారుదల', 'నీరు',
  'తెగులు', 'తెగుళ్ళు', 'పురుగు', 'కీటక', 'పశువు', 'ఆవు', 'గేదె', 'మేక', 'గొర్రె', 'కోళ్లు', 'కోడి',
  'ట్రాక్టర్', 'మార్కెట్ ధర', 'ధరలు', 'భీమా', 'రుణం', 'రుణాలు', 'పథకం', 'పథకాలు', 'వరి', 'ప్రత్తి',
  'మొక్కజొన్న', 'వేరుశనగ', 'టమోటా', 'చెరకు', 'నాట్లు', 'కోత', 'సాగు', 'యూరియా', 'డ్రిప్', 'స్పింక్లర్',
  'కిసాన్', 'భరోసా', 'రైతు', 'పోటాష్', 'నత్రజని', 'పిండి', 'కలుపు', 'పశుగ్రాసం', 'పాల', 'వర్షం', 'కురుస్తుంది',
  'వాతావరణం', 'వర్షపాతం', 'పశుగ్రాసం',

  // --- Hindi Keywords (खेती-बाड़ी से जुड़े शब्द) ---
  'कृषि', 'खेती', 'फसल', 'मौसम', 'बारिश', 'वर्षा', 'मिट्टी', 'मृदा', 'बीज', 'खाद', 'उर्वरक', 'सिंचाई',
  'कीट', 'बीमारी', 'रोग', 'पशुधन', 'गाय', 'भैंस', 'बकरी', 'भेड़', 'मुर्गीपालन', 'ट्रैक्टर', 'बाजार भाव',
  'कीमत', 'दाम', 'बीमा', 'ऋण', 'कर्ज', 'योजना', 'धान', 'चावल', 'कपास', 'मक्का', 'मूंगफली', 'टमाटर',
  'गन्ना', 'बुवाई', 'कटाई', 'सिंचन', 'कीटनाशक', 'यूरिया', 'ड्रिप', 'किसान', 'नमी', 'तापमान', 'गोबर',
  'कंपोस्ट', 'सिंचाई', 'खरपतवार', 'पशु', 'दूध',

  // --- Tamil Keywords (விவசாய வார்த்தைகள்) ---
  'விவசாயம்', 'பயிர்', 'வானிலை', 'மழை', 'மண்', 'விதை', 'உரம்', 'பாசனம்', 'பூச்சி', 'நோய்', 'கால்நடை',
  'பசு', 'எருமை', 'ஆடு', 'கோழி', 'டிராக்டர்', 'சந்தை விலை', 'காப்பீடு', 'கடன்', 'திட்டம்', 'நெல்', 'அரிசி',
  'பருத்தி', 'சோளம்', 'நிலக்கடலை', 'தக்காளி', 'கரும்பு', 'விதைப்பு', 'அறுவடை', 'பூச்சிக்கொல்லி', 'யூரியா',
  'சொட்டுநீர்', 'விவசாயி', 'மழைப்பொழிவு', 'அழுகல்', 'கலப்பை'
];

// General greetings or identity questions that should be allowed
const ALLOWED_GREETINGS = [
  'hello', 'hi', 'namaste', 'hey', 'good morning', 'good afternoon', 'good evening', 'who are you',
  'your name', 'how are you', 'help me', 'agroguide',
  'హలో', 'నమస్కారం', 'బాగున్నారా', 'నీ పేరు', 'ఎవరు నువ్వు', 'సహాయం',
  'नमस्ते', 'हैलो', 'तुम कौन हो', 'आपका नाम', 'कैसे हो', 'मदद',
  'வணக்கம்', 'யார் நீ', 'நலமா', 'உன் பெயர்', 'உதவி'
];

/**
 * Validates whether a query is safe from prompt injections and is domain-specific.
 * @param {string} message - User query
 * @returns {Object} { isAllowed: boolean, reason: string, reply: string }
 */
export const checkDomainFirewall = (message) => {
  if (!message) {
    return { isAllowed: false, reason: 'empty', reply: BLOCKED_RESPONSES['en-US'] };
  }

  const msg = message.toLowerCase().trim();
  const language = detectLanguage(message);

  // 1. Detect Prompt Injection
  const hasInjection = PROMPT_INJECTION_KEYWORDS.some(keyword => msg.includes(keyword));
  if (hasInjection) {
    console.warn(`[Security Alert] Prompt Injection attempt detected: "${message}"`);
    return {
      isAllowed: false,
      reason: 'PROMPT_INJECTION',
      reply: 'Security Block: Request ignored.'
    };
  }

  // 2. Allow general greetings and bot identity
  const isGreeting = ALLOWED_GREETINGS.some(greeting => msg.includes(greeting));
  if (isGreeting) {
    return { isAllowed: true, reason: 'GREETING' };
  }

  // 3. Scan for domain keywords
  const isDomainRelated = AGRI_KEYWORDS.some(keyword => msg.includes(keyword));
  if (isDomainRelated) {
    return { isAllowed: true, reason: 'IN_DOMAIN' };
  }

  // If we reach here, the query is unrelated
  console.log(`[Firewall Blocked] Unrelated query: "${message}"`);
  return {
    isAllowed: false,
    reason: 'OUT_OF_DOMAIN',
    reply: BLOCKED_RESPONSES[language] || BLOCKED_RESPONSES['en-US']
  };
};
