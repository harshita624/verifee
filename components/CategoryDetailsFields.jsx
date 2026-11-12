"use client";

export function inferCategoryFromProduct(product = "") {
  const value = String(product).toLowerCase();
  const rules = [
    ["transport", /\b(auto|rickshaw|taxi|cab|ride|fare|bus|train)\b/],
    ["hotels", /\b(hotel|room|hostel|guesthouse|lodging|stay)\b/],
    ["tickets", /\b(ticket|entry|admission|museum|monument|attraction)\b/],
    ["jewelry", /\b(jewel|jewellery|jewelry|gold|silver|gemstone|bangle|bangles|chuda|chooda|chudi|bracelet)\b/],
    ["electronics", /\b(phone|mobile|laptop|charger|earbuds|camera)\b/],
    ["food", /\b(food|meal|snack|thali|pani puri|chaat|chai|tea|coffee|restaurant)\b/],
    ["fruits", /\b(fruit|vegetable|mango|apple|banana|tomato|potato|onion|kg)\b/],
    ["textiles", /\b(saree|sari|shawl|carpet|rug|textile|fabric|shirt|clothing|pashmina)\b/],
    ["handicrafts", /\b(handmade|handicraft|craft|marble|carving|pottery)\b/],
    ["souvenirs", /\b(souvenir|magnet|keychain|gift|postcard)\b/],
  ];
  return rules.find(([, pattern]) => pattern.test(value))?.[0] || "";
}

const DEFINITIONS = {
  transport: [["pickup", "Pickup", "e.g. KIIT University"], ["destination", "Destination", "e.g. Saheed Nagar"], ["vehicle", "Vehicle", "auto"], ["fareType", "Fare basis", "meter"], ["tollAmount", "Actual toll charge (₹, optional)", ""], ["quotedFare", "Driver's quoted fare (₹, optional)", ""]],
  hotels: [["roomType", "Room type", "standard double"], ["nights", "Nights", "1"], ["guests", "Guests", "2"], ["stayDate", "Stay date / season", ""]],
  food: [["serving", "Serving size", "one plate / 250 g"], ["serviceMode", "Dine-in or takeaway", "dine-in"], ["quantity", "Quantity", "1"]],
  textiles: [["material", "Fabric / material", "cotton / silk"], ["dimensions", "Size / dimensions", ""], ["make", "Handmade or machine-made", "handmade"]],
  handicrafts: [["material", "Material", "wood / stone / metal"], ["dimensions", "Size / dimensions", ""], ["make", "Handmade or machine-made", "handmade"]],
  jewelry: [["metal", "Metal / material", "gold, silver, or lacquer"], ["purity", "Purity (precious metals)", "22k / 925"], ["weightGrams", "Weight (grams)", ""], ["pieceCount", "Pieces in set", "e.g. 2 or 4"], ["stones", "Stones / quality", ""]],
  electronics: [["model", "Brand and exact model", ""], ["condition", "Condition", "new / used / refurbished"], ["specs", "Key specification", "storage / size"], ["warranty", "Warranty", ""]],
  souvenirs: [["material", "Material", ""], ["dimensions", "Size", ""], ["bundle", "Single item or set", "single item"]],
  fruits: [["variety", "Variety", ""], ["quantity", "Quantity", ""], ["unit", "Unit", "kg / dozen"], ["freshness", "Freshness / grade", ""]],
  tickets: [["venue", "Venue / attraction", ""], ["visitDate", "Visit date", ""], ["visitorType", "Visitor type", "adult / child / local"], ["access", "Included access", ""]],
};

export default function CategoryDetailsFields({ category, value = {}, onChange, className = "" }) {
  const fields = DEFINITIONS[String(category || "").toLowerCase()];
  if (!fields?.length) return null;
  const update = (key, next) => onChange({ ...value, [key]: next });
  return (
    <section className={`rounded-xl border border-zinc-200 bg-zinc-50 p-3 ${className}`}>
      <div className="mb-2"><p className="text-sm font-semibold capitalize text-zinc-800">{category} comparison details</p><p className="text-xs text-zinc-500">These details help compare like-for-like items or services.</p></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(([key, title, placeholder]) => {
          const isWholeCount = ["nights", "guests", "pieceCount"].includes(key);
          const isNumeric = ["nights", "guests", "quantity", "weightGrams", "pieceCount", "tollAmount", "quotedFare"].includes(key);
          const minimum = isWholeCount ? 1 : ["quantity", "weightGrams"].includes(key) ? 0.01 : ["tollAmount", "quotedFare"].includes(key) ? 0 : undefined;
          const step = isWholeCount ? 1 : isNumeric ? "any" : undefined;
          const rawValue = value[key] ?? "";
          const fieldValue = isWholeCount && rawValue !== "" && Number.isFinite(Number(rawValue))
            ? Math.max(1, Math.round(Number(rawValue)))
            : rawValue;
          return (
            <label key={key} className="text-xs font-medium text-zinc-600">
              {title}
              {key === "vehicle" ? (
                <select value={value[key] || "auto"} onChange={(e) => update(key, e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"><option value="auto">Auto-rickshaw</option><option value="cab">App cab / taxi</option><option value="bus">Bus</option></select>
              ) : key === "fareType" ? (
                <select value={value[key] || "meter"} onChange={(e) => update(key, e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"><option value="meter">Meter</option><option value="fixed">Agreed fixed fare</option><option value="app">App fare</option></select>
              ) : (
                <input type={isNumeric ? "number" : "text"} min={minimum} step={step} value={fieldValue} onChange={(e) => update(key, e.target.value)} placeholder={["tollAmount", "quotedFare"].includes(key) ? "amount in rupees" : placeholder} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400" />
              )}
            </label>
          );
        })}
      </div>
      {String(category || "").toLowerCase() === "transport" && (
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Enter only a real toll charge above, not the driver's total quote. The quote is for the scam check. Toll amounts are user-provided; Verifee does not look up toll charges. Leave toll blank if none applies.
        </p>
      )}
      {String(category || "").toLowerCase() === "jewelry" && /^(laakh|lakh|lac|lacquer)$/i.test(String(value.metal || "").trim()) && (
        <p className="mt-2 text-xs leading-5 text-amber-800">
          We read “laakh/lac” here as lacquer material, not ₹1 lakh and not gold. Add the number of pieces so the estimate compares a similar set.
        </p>
      )}
    </section>
  );
}
