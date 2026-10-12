import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const VALID_ROUTES = [
  "/profile",
  "/financial-management",
  "/wealth-management",
  "/notes",
  "/daily-quests",
  "/calendar",
  "/weather",
];

export default async function RootPage() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "admin") {
      redirect("/database");
    }
    const cookieStore = await cookies();
    const defaultRoute = cookieStore.get("default_app_route")?.value || "/financial-management";
    const targetRoute = VALID_ROUTES.includes(defaultRoute)
      ? defaultRoute
      : "/financial-management";
    redirect(targetRoute);
  } else {
    redirect("/login");
  }
}
