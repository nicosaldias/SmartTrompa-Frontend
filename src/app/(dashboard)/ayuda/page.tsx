import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import AyudaClient from "./AyudaClient";

export const metadata = { title: "Ayuda y Soporte - Smart Trompa" };

export default async function AyudaPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");
  const user = await getCurrentUser();
  return <AyudaClient userRut={user?.rut || ""} />;
}
