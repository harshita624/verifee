const CITY_ALIASES = {
  "delhi":"Delhi","new delhi":"Delhi","dilli":"Delhi",
  "mumbai":"Mumbai","bombay":"Mumbai",
  "jaipur":"Jaipur","pink city":"Jaipur",
  "agra":"Agra",
  "varanasi":"Varanasi","banaras":"Varanasi","kashi":"Varanasi",
  "srinagar":"Srinagar","kashmir":"Srinagar",
  "goa":"Goa",
  "bangalore":"Bangalore","bengaluru":"Bangalore",
  "hyderabad":"Hyderabad",
  "chennai":"Chennai","madras":"Chennai",
  "kolkata":"Kolkata","calcutta":"Kolkata",
  "kochi":"Kochi","cochin":"Kochi",
  "udaipur":"Udaipur",
  "amritsar":"Amritsar",
  "mysore":"Mysore","mysuru":"Mysore",
  "pune":"Pune",
  "ahmedabad":"Ahmedabad",
  "chandigarh":"Chandigarh",
  "lucknow":"Lucknow",
  "sarojini":"Delhi",
  "lajpat":"Delhi",
  "connaught":"Delhi",
};

const PRODUCT_ALIASES = {
  "pashmina":"Pashmina Shawl",
  "carpet":"Kashmiri Carpet","rug":"Kashmiri Carpet",
  "saree":"Silk Saree","sari":"Silk Saree",
  "banarasi":"Banarasi Silk Saree",
  "auto":"Auto Rickshaw Ride","rickshaw":"Auto Rickshaw Ride",
  "taxi":"Taxi Ride","cab":"Taxi Ride","uber":"Taxi Ride","ola":"Taxi Ride",
  "hotel":"Hotel Room","room":"Hotel Room",
  "pottery":"Blue Pottery",
  "marble":"Marble Artifact",
  "spices":"Indian Spices",
  "saffron":"Kashmiri Saffron",
  "leather bag":"Leather Bag",
  "handicraft":"Handicraft",
  "jewellery":"Jewellery","jewelry":"Jewellery",
  "kurta":"Kurta","kurti":"Kurti",
  "bedsheet":"Bedsheet","bed sheet":"Bedsheet",
  "dupatta":"Dupatta",
  "bangles":"Bangles",
};

const INTENT_PATTERNS = [
  {
    intent: "greeting",
    patterns: [
      /^(hi+|hello+|hey+|namaste|hola|howdy)\b/i,
      /^(good (morning|afternoon|evening|day))\b/i,
      /^(thank(s|u| you)|thx|ty|thanku|thnk|thank you so much)\b/i,
      /^(ok(ay)?|cool|nice|great|wow|awesome|perfect|got it|sure|alright)\b/i,
      /^(bye|goodbye|see you|cya|later|take care)\b/i,
      /^(yes|no|yeah|nope|yep|nah)\b/i,
      /^(lol|haha|hehe|😊|👍)\b/i,
    ],
  },
  {
    intent: "about",
    patterns: [
      /what (is|are|can) (verifee|you|this)/i,
      /how (does|do) (this|it|verifee) work/i,
      /what can you (do|help)/i,
      /tell me about/i,
      /features?/i,
    ],
  },
  {
    intent: "price_check",
    patterns: [
      /how much (is|does|for|cost)/i,
      /what('s| is) the (fair |right |local )?price/i,
      /fair price/i,
      /right price/i,
      /price (of|for)/i,
      /check price/i,
      /what should i pay/i,
      /kitna (hai|ka|hoga)/i,
      /cost of/i,
    ],
  },
  {
    intent: "scam_detect",
    patterns: [
      /am i being (scammed|cheated|ripped off)/i,
      /is (this|it) (a scam|too (much|expensive|high))/i,
      /overcharg/i,
      /quoted me/i,
      /they (are|said|asked|want) ₹/i,
      /is ₹\s*\d+ (fair|ok|too much|right)/i,
      /being ripped/i,
      /tourist price/i,
      /they want/i,
    ],
  },
  {
    intent: "bargain_help",
    patterns: [
      /how (to|do i) (bargain|negotiate|haggle)/i,
      /what (should|can) i (say|offer|do)/i,
      /how to (get|bring) (down|lower) the price/i,
      /bargain(ing)?/i,
      /negotiat/i,
      /walk away/i,
    ],
  },
  {
    intent: "translate",
    patterns: [
      /how (do i|to) say/i,
      /translate/i,
      /in (hindi|tamil|telugu|kannada|marathi|bengali|gujarati|punjabi)/i,
    ],
  },
  {
    intent: "market_info",
    patterns: [
      /where (to|can i) (buy|find|get)/i,
      /best (market|place|shop|bazaar)/i,
      /which (market|shop|place)/i,
      /trusted (shop|vendor|seller)/i,
      /good place to buy/i,
    ],
  },
  {
    intent: "scam_warning",
    patterns: [
      /common scam/i,
      /watch out/i,
      /beware/i,
      /tourist trap/i,
      /warning/i,
    ],
  },
];

function classifyIntent(text) {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(text))) return intent;
  }
  return "general";
}

function extractEntities(text) {
  const entities = { city: null, product: null, price: null, market: null };

  const priceMatch = text.match(
    /(?:₹|rs\.?|inr|rupees?)\s*([\d,]+)|([\d,]+)\s*(?:rupees?|rs\.?|₹)/i
  );
  if (priceMatch) {
    entities.price = parseInt((priceMatch[1]||priceMatch[2]).replace(/,/g,""),10);
  }

  const lower = text.toLowerCase();
  for (const [alias,canonical] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias)) { entities.city = canonical; break; }
  }

  for (const [alias,canonical] of Object.entries(PRODUCT_ALIASES)) {
    if (lower.includes(alias.toLowerCase())) { entities.product = canonical; break; }
  }

  if (!entities.city) {
    const m = text.match(/\b(?:in|at|from|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (m) entities.city = m[1];
  }

  if (!entities.product) {
    const m = text.match(
      /(?:price|cost|worth|buying|bought|paid for|for a|for an)\s+(?:a\s+|an\s+)?([a-z\s]{3,30}?)(?:\s+in|\s+at|\s+from|\?|$)/i
    );
    if (m) entities.product = capitalise(m[1].trim());
  }

  const mktMatch = text.match(
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Bazaar|Market|Chowk|Mandi|Mall|Nagar))/i
  );
  if (mktMatch) entities.market = mktMatch[1];

  return entities;
}

function capitalise(str) {
  return str.split(" ").map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
}

function normaliseQuery(text) {
  return text
    .replace(/₹/g," ₹ ")
    .replace(/rs\.?\s*/gi,"₹")
    .replace(/(\d)\s*k\b/gi,(_,n)=>n+"000")
    .replace(/(\d)\s*lakh\b/gi,(_,n)=>n+"00000")
    .replace(/gonna/gi,"going to").replace(/wanna/gi,"want to").replace(/gotta/gi,"got to")
    .replace(/\s+/g," ").trim();
}

class SessionContext {
  constructor() {
    this.city=null; this.product=null; this.budget=null;
    this.lang="hi"; this.history=[]; this.pricesSeen=[];
    this.lastTopic=null;
  }

  update(text,intent,entities) {
    if (entities.city)    this.city    = entities.city;
    if (entities.product) this.product = entities.product;
    if (entities.price)   this.pricesSeen.push(entities.price);
    if (!["greeting","general","about"].includes(intent)) this.lastTopic = intent;
    this.history.push({intent,entities,text,ts:Date.now()});
    if (this.history.length>12) this.history.shift();
  }

  getContext() {
    return {
      city:          this.city,
      product:       this.product,
      budget:        this.budget,
      lang:          this.lang,
      recentIntents: this.history.slice(-4).map(h=>h.intent),
      pricesSeen:    this.pricesSeen,
      lastTopic:     this.lastTopic,
    };
  }

  isFollowUp(text) {
    return /\b(it|that|this|there|the same|those|them)\b/i.test(text) && this.history.length>0;
  }

  resolveAnaphora(text,entities) {
    if (!entities.product && this.product && this.isFollowUp(text)) entities.product=this.product;
    if (!entities.city && this.city) entities.city=this.city;
    return entities;
  }
}

const sessions = new Map();
function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new SessionContext());
    setTimeout(()=>sessions.delete(sessionId), 30*60*1000);
  }
  return sessions.get(sessionId);
}

function processQuery(text,sessionId) {
  const normalised = normaliseQuery(text);
  const intent     = classifyIntent(normalised);
  let   entities   = extractEntities(normalised);
  if (sessionId) {
    const session = getSession(sessionId);
    entities = session.resolveAnaphora(normalised,entities);
    session.update(normalised,intent,entities);
  }
  return {normalised,intent,entities};
}

module.exports = {
  classifyIntent,extractEntities,normaliseQuery,
  processQuery,getSession,SessionContext,
};