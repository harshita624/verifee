const { escapeRegex } = require("./regex");

// Keep genuinely equivalent names together across estimates, reports, trends,
// and scam checks. Keep subtypes (for example kurta and kurti) separate.
const PRODUCT_GROUPS = [
  {
    canonical: "Auto Rickshaw Ride",
    aliases: ["auto", "auto ride", "auto rides", "auto trip", "auto rickshaw", "auto rickshaw ride", "rickshaw", "rickshaw ride", "rickshaw trip", "tuk tuk", "tuk-tuk", "three wheeler", "three-wheeler", "three wheeler ride", "autorickshaw", "autorickshaw ride"],
  },
  { canonical: "Taxi Ride", aliases: ["taxi", "taxi ride", "cab", "cab ride", "taxicab", "uber", "ola"] },
  { canonical: "Hotel Room", aliases: ["hotel room", "hotel rooms", "room at hotel", "lodging"] },
  { canonical: "Pashmina Shawl", aliases: ["pashmina", "pashmina shawl", "pashmina scarf"] },
  { canonical: "Kashmiri Carpet", aliases: ["carpet", "carpets", "rug", "rugs", "kashmiri carpet", "kashmiri rug"] },
  { canonical: "Silk Saree", aliases: ["saree", "sari", "silk saree", "silk sari"] },
  { canonical: "Banarasi Silk Saree", aliases: ["banarasi", "banarasi saree", "banarasi sari", "banarasi silk saree"] },
  { canonical: "Blue Pottery", aliases: ["blue pottery", "pottery"] },
  { canonical: "Marble Artifact", aliases: ["marble", "marble artifact", "marble handicraft", "marble sculpture"] },
  { canonical: "Indian Spices", aliases: ["spice", "spices", "indian spice", "indian spices", "masala", "masalas"] },
  { canonical: "Kashmiri Saffron", aliases: ["saffron", "kashmiri saffron", "kesar"] },
  { canonical: "Leather Bag", aliases: ["leather bag", "leather bags"] },
  { canonical: "Handicraft", aliases: ["handicraft", "handicrafts", "handcraft", "handcrafts", "handmade craft"] },
  { canonical: "Jewellery", aliases: ["jewellery", "jewelry", "jewels", "ornaments"] },
  { canonical: "Kurta", aliases: ["kurta", "kurtas"] },
  { canonical: "Kurti", aliases: ["kurti", "kurtis"] },
  { canonical: "Bedsheet", aliases: ["bedsheet", "bed sheet", "bed sheets", "bedsheets", "bed linen"] },
  { canonical: "Dupatta", aliases: ["dupatta", "dupatte", "stole"] },
  { canonical: "Bangles", aliases: ["bangle", "bangles", "bracelet", "bracelets"] },
  { canonical: "Bottled Water", aliases: ["bottled water", "bottle of water", "packaged water", "mineral water", "drinking water bottle"] },
  { canonical: "Mobile Phone", aliases: ["mobile", "mobile phone", "cell phone", "cellphone", "smartphone", "smart phone"] },
  { canonical: "T Shirt", aliases: ["t shirt", "t-shirt", "tee shirt", "tee", "tshirt"] },
  { canonical: "Sneakers", aliases: ["sneaker", "sneakers", "trainer", "trainers", "athletic shoes"] },
  { canonical: "Sunglasses", aliases: ["sunglasses", "sun glasses", "shades"] },
];

const normalizeWords = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[’']/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");

const GROUPS_BY_ALIAS = new Map();
for (const group of PRODUCT_GROUPS) {
  for (const alias of group.aliases) GROUPS_BY_ALIAS.set(normalizeWords(alias), group);
  GROUPS_BY_ALIAS.set(normalizeWords(group.canonical), group);
}

function findProductGroup(value) {
  const normalized = normalizeWords(value);
  if (!normalized) return null;
  const exact = GROUPS_BY_ALIAS.get(normalized);
  if (exact) return exact;

  // Match a known name embedded in a descriptive product name, preferring the
  // longest alias so "Banarasi silk saree" remains distinct from a plain saree.
  const tokens = ` ${normalized} `;
  let best = null;
  let bestLength = 0;
  for (const [alias, group] of GROUPS_BY_ALIAS) {
    if (alias.length > bestLength && tokens.includes(` ${alias} `)) {
      best = group;
      bestLength = alias.length;
    }
  }
  return best;
}

function singularize(word) {
  if (word.length > 4 && /ies$/.test(word)) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && /(ches|shes|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && /s$/.test(word) && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

function wordForms(word) {
  const singular = singularize(word);
  const forms = new Set([word, singular]);
  if (singular.length > 1) {
    if (/[^aeiou]y$/.test(singular)) forms.add(`${singular.slice(0, -1)}ies`);
    else if (/(s|x|z|ch|sh|o)$/.test(singular)) forms.add(`${singular}es`);
    else forms.add(`${singular}s`);
  }
  return [...forms];
}

function normalizeProductName(value) {
  const original = String(value || "").replace(/\s+/g, " ").trim();
  const group = findProductGroup(original);
  if (group) return group.canonical;

  // Normalize punctuation and ordinary plural variants for products without a
  // curated synonym entry; this catches "apples"/"apple" without broad fuzzy
  // matching that could mix different products.
  return normalizeWords(original).split(" ").map(singularize).join(" ");
}

function resolveProductMention(value) {
  return findProductGroup(value)?.canonical || null;
}

function phrasePattern(phrase) {
  const words = normalizeWords(phrase).split(" ").filter(Boolean).map(escapeRegex);
  return words.join("[\\s-]+");
}

function productNameRegex(value) {
  const group = findProductGroup(value);
  if (group) {
    const aliases = [...new Set([...group.aliases, group.canonical])]
      .sort((a, b) => b.length - a.length)
      .map(phrasePattern);
    return new RegExp(`(?:^|[^a-z0-9])(?:${aliases.join("|")})(?:$|[^a-z0-9])`, "i");
  }

  // Unknown multiword names match only when every queried word is present,
  // regardless of order. This avoids the old OR regex matching an unrelated
  // item merely because it shared one common word (e.g. "leather").
  const tokens = normalizeProductName(value).split(" ").filter(Boolean);
  if (!tokens.length) return /$a/;
  const lookaheads = tokens.map((token) => {
    const forms = wordForms(token).sort((a, b) => b.length - a.length);
    return `(?=.*(?:^|[^a-z0-9])(?:${forms.map(escapeRegex).join("|")})(?:$|[^a-z0-9]))`;
  });
  return new RegExp(`^${lookaheads.join("")}.*$`, "i");
}

module.exports = { normalizeProductName, productNameRegex, resolveProductMention };
