import { permanentRedirect } from "next/navigation";

// See app/checkout/page.tsx for why this is a plain redirect.
export default function GameRedirect() {
  permanentRedirect("/games");
}
