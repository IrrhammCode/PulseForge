import { redirect } from "next/navigation";

/** Root always opens the landing page first */
export default function RootPage() {
  redirect("/welcome");
}