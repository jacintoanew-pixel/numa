import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginPage from "@/app/login/page";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vx_auth_token")?.value;

  if (token) {
    redirect("/dashboard");
  }

  return <LoginPage />;
}
