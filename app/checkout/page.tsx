import { permanentRedirect } from "next/navigation";

// checkout.html, game.html and play.html were legacy stand-ins for a demo
// game product ("דיבורים מהלב") that was never part of the real catalog —
// the original site already turned them into redirect-only pages pointing
// at games.html (via <meta http-equiv="refresh">).
//
// The redirect that visitors actually get is declared in next.config.ts
// (retiredRoutes), which answers with a genuine 308 before this file is
// reached. This stays as the fallback for a build where that list is not
// applied; on its own, from a prerendered page, it can only produce a 200
// with a meta refresh.
export default function CheckoutRedirect() {
  permanentRedirect("/games");
}
