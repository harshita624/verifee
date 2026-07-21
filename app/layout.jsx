import "./globals.css";
import Navbar  from "@/components/layout/Navbar";
import Footer  from "@/components/layout/Footer";
import AIChat  from "@/components/shared/AIChat";

export const metadata = {
  title:       "Verifee — Know the Fair Price Before You Buy",
  description: "The only app that tells you what locals actually pay. Community-verified prices, scam detection, and bargaining help for travelers across India.",
  keywords:    "fair price India, tourist scam detector, market prices India, bargaining India, Verifee",
  openGraph: {
    title:       "Verifee — Know the Fair Price Before You Buy",
    description: "Stop paying tourist prices. Know what locals pay.",
    type:        "website",
  },
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Navbar />
        {/* pb-20 ensures footer never glues to content */}
        <main className="min-h-screen pb-20">
          {children}
        </main>
        <Footer />
        <AIChat />
      </body>
    </html>
  );
}