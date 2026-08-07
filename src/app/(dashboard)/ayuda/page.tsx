import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import AyudaClient from "./AyudaClient";

export const metadata = { title: "Ayuda y Soporte - SIMOR" };

export default async function AyudaPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");
  // Tokens válidos sin st_user = estado inconsistente → re-login lo repara
  // (mismo patrón que las demás páginas del dashboard). Antes se renderizaba
  // con rut vacío y la carga de tickets quedaba muda.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AyudaClient userRut={user.rut || ""} userCargo={user.cargo || "Trabajador"} />;
}
