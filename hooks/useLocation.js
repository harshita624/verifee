"use client";

import { useState, useEffect, useCallback } from "react";

const NOMINATIM = "https://nominatim.openstreetmap.org";

export function useLocation() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);

  // Load saved city from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("vf_city");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCity(parsed.city || "");
        setState(parsed.state || "");
        setCountry(parsed.country || "");
      } catch {}
    }
  }, []);

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser");
      return;
    }

    setDetecting(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(
            `${NOMINATIM}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );

          if (!res.ok) throw new Error("Reverse geocoding failed");
          const data = await res.json();

          const addr = data.address || {};
          const detectedCity =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.suburb ||
            addr.county ||
            "";
          const detectedState = addr.state || "";
          const detectedCountry = addr.country || "";

          setCity(detectedCity);
          setState(detectedState);
          setCountry(detectedCountry);

          localStorage.setItem(
            "vf_city",
            JSON.stringify({ city: detectedCity, state: detectedState, country: detectedCountry })
          );
        } catch {
          setError("Could not determine your city. Please type it manually.");
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location permission denied. Type your city manually.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location unavailable. Type your city manually.");
            break;
          default:
            setError("Could not detect location. Type your city manually.");
        }
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  const setManualCity = useCallback((cityName) => {
    setCity(cityName);
    localStorage.setItem(
      "vf_city",
      JSON.stringify({ city: cityName, state, country })
    );
  }, [state, country]);

  const clearCity = useCallback(() => {
    setCity("");
    setState("");
    setCountry("");
    setCoords(null);
    localStorage.removeItem("vf_city");
  }, []);

  return { city, state, country, coords, detecting, error, detectLocation, setManualCity, clearCity };
}