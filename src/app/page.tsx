import { redirect } from "next/navigation";

/**
 * Root entry. Send users to the batches list; the (app) layout will bounce
 * unauthenticated users to /login.
 */
export default function Home() {
  redirect("/batches");
}
