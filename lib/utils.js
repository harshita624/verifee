import {
  Shirt, Scissors, Gem, UtensilsCrossed,
  Hotel, Car, Smartphone, Gift, Apple, Ticket,
} from "lucide-react";

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(amount, currency = "₹") {
  if (!amount && amount !== 0) return "—";
  return `${currency}${Number(amount).toLocaleString("en-IN")}`;
}

export function getScamColor(probability) {
  if (probability >= 70) return { text: "#dc2626", bg: "#fef2f2", label: "High Risk" };
  if (probability >= 40) return { text: "#d97706", bg: "#fffbeb", label: "Medium Risk" };
  return { text: "#16a34a", bg: "#f0fdf4", label: "Low Risk" };
}

export function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const LANGUAGES = [
  { code: "hi", name: "Hindi",     native: "हिन्दी"    },
  { code: "te", name: "Telugu",    native: "తెలుగు"    },
  { code: "ta", name: "Tamil",     native: "தமிழ்"     },
  { code: "kn", name: "Kannada",   native: "ಕನ್ನಡ"    },
  { code: "ml", name: "Malayalam", native: "മലയാളം"   },
  { code: "mr", name: "Marathi",   native: "मराठी"     },
  { code: "bn", name: "Bengali",   native: "বাংলা"     },
  { code: "gu", name: "Gujarati",  native: "ગુજરાતી"   },
  { code: "pa", name: "Punjabi",   native: "ਪੰਜਾਬੀ"   },
  { code: "or", name: "Odia",      native: "ଓଡ଼ିଆ"    },
  { code: "en", name: "English",   native: "English"   },
];

export const CATEGORIES = [
  { id: "textiles",    label: "Textiles & Clothing", icon: Shirt,           color: "#8b5cf6" },
  { id: "handicrafts", label: "Handicrafts",          icon: Scissors,        color: "#f59e0b" },
  { id: "jewelry",     label: "Jewellery",            icon: Gem,             color: "#ec4899" },
  { id: "food",        label: "Street Food",          icon: UtensilsCrossed, color: "#f97316" },
  { id: "hotels",      label: "Hotels & Stay",        icon: Hotel,           color: "#0ea5e9" },
  { id: "transport",   label: "Transport",            icon: Car,             color: "#6366f1" },
  { id: "electronics", label: "Electronics",          icon: Smartphone,      color: "#14b8a6" },
  { id: "souvenirs",   label: "Souvenirs",            icon: Gift,            color: "#84cc16" },
  { id: "fruits",      label: "Fruits & Veg",         icon: Apple,           color: "#22c55e" },
  { id: "tickets",     label: "Tickets & Entry",      icon: Ticket,          color: "#ef4444" },
];