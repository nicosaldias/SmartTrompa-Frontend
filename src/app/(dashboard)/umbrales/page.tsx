import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import { puedeAdministrar } from "@/utils/roles";
import UmbralesClient from "./UmbralesClient";

export const metadata = {
  title: "Gestión de Umbrales - SIMOR",
};

export default async function UmbralesPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Página admin-only (Administrador o SuperAdministrador): ocultar el link
  // del sidebar no basta si navegan directo.
  // Tokens válidos sin st_user = estado inconsistente → re-login lo repara.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!puedeAdministrar(user.cargo)) redirect("/resumen");

  return <UmbralesClient />;
}
