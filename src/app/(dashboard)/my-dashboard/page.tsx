import { redirect } from "next/navigation";

// The host dashboard was merged into the unified, role-aware /home. Keep this
// route as a redirect so old links and bookmarks still land in the right place.
export default function MyDashboardRedirect() {
  redirect("/home");
}
