// Edit these values (or set the NEXT_PUBLIC_* env vars) so the footer, legal
// pages and contact page show YOUR real details.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const SITE = {
  name: "Verifee",

  // Name shown in the legal pages and the footer copyright. Use your real
  // registered name only if you have one; otherwise leave it as "Verifee".
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || "Verifee",

  tagline: "Know the fair price. Shop without fear. Travel with confidence.",

  // Must be an inbox you actually read. hello@verifee.in is only a placeholder.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@verifee.in",

  location: process.env.NEXT_PUBLIC_LOCATION || "India",

  // Shown on the Careers page and footer-adjacent pages when set.
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL || "",

  // Policy values used in the Terms and Privacy pages. Change to what you decide.
  refundWindowDays: 7,
  minAge: 18,
  jurisdiction: "India",
  legalUpdated: "11 October 2026",
};