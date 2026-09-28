"use client";

import { useEffect } from "react";

import { EnchantedForestGame } from "@/src/games/enchanted-forest";

export default function ForestGameClient() {
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return <EnchantedForestGame allowed />;
}
