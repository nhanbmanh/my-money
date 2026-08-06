import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await auth();

  if (session?.user) {
    const cookieStore = await cookies();
    const defaultRoute = cookieStore.get("default_app_route")?.value || "/financial-management";
    const targetRoute = ["/financial-management", "/weather"].includes(defaultRoute)
      ? defaultRoute
      : "/financial-management";
    redirect(targetRoute);
  } else {
    redirect("/login");
  }
}
