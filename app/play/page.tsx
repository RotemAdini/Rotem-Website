import { redirect } from "next/navigation";

// See app/checkout/page.tsx for why this is a plain redirect.
export default function PlayRedirect() {
  redirect("/games");
}
