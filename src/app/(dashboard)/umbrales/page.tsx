import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import UmbralesClient from "./UmbralesClient";

export const metadata = {
  title: "Gestión de Umbrales - SIMOR",
};

export default async function UmbralesPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  return <UmbralesClient />;
}
