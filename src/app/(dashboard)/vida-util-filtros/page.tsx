import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import VidaUtilFiltrosClient from "./VidaUtilFiltrosClient";

export const metadata = { title: "Vida Útil de Filtros - SIMOR" };

export default async function VidaUtilFiltrosPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Vista de supervisión: el Trabajador tiene su propia vista personal.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.cargo === "Trabajador") redirect("/mi-historial");
  const isAdmin = user.cargo === "Administrador";

  const estadoFiltros = await api.filterLifecycle.estado(cookieHeader);
  return <VidaUtilFiltrosClient initialData={estadoFiltros} isAdmin={isAdmin} />;
}
