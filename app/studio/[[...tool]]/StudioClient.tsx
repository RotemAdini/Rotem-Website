"use client";

import { NextStudio } from "next-sanity/studio";

import config from "@/sanity.config";

/** The Studio itself. Split into its own client component so the route can
 * decide, on the server, whether Sanity is configured at all before loading
 * the (large) Studio bundle. */
export default function StudioClient() {
  return <NextStudio config={config} />;
}
