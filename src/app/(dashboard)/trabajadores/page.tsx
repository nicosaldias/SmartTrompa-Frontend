import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import TrabajadoresClient from "./TrabajadoresClient";

export const metadata = { title: "Trabajadores - SIMOR" };

export default async function TrabajadoresPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Página solo-Admin: ocultar el link del sidebar no basta si navegan directo.
  // Tokens válidos sin st_user = estado inconsistente → re-login lo repara.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.cargo !== "Administrador") redirect("/resumen");

  const pageData = await api.trabajadores.listPaged(0, 20, cookieHeader);
  return <TrabajadoresClient initialPage={pageData} />;
}
