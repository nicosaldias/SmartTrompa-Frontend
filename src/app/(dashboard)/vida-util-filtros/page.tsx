import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import { esTrabajador, puedeAdministrar } from "@/utils/roles";
import api from "@/api/client";
import VidaUtilFiltrosClient from "./VidaUtilFiltrosClient";

export const metadata = { title: "Vida Útil de Filtros - SIMOR" };

export default async function VidaUtilFiltrosPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Vista de supervisión: el Trabajador tiene su propia vista personal.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (esTrabajador(user.cargo)) redirect("/mi-historial");
  // Acciones de admin también para el SuperAdministrador (opera globalmente).
  const isAdmin = puedeAdministrar(user.cargo);

  const estadoFiltros = await api.filterLifecycle.estado(cookieHeader);
  return <VidaUtilFiltrosClient initialData={estadoFiltros} isAdmin={isAdmin} />;
}
