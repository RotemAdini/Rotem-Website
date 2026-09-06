import { redirect } from "next/navigation";

// checkout.html, game.html and play.html were legacy stand-ins for a demo
// game product ("דיבורים מהלב") that was never part of the real catalog —
// the original site already turned them into redirect-only pages pointing
// at games.html (via <meta http-equiv="refresh">). A real server redirect
// is the more correct way to do the same thing in Next.js.
export default function CheckoutRedirect() {
  redirect("/games");
}
