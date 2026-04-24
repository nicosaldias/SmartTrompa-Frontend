import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import VidaUtilFiltrosClient from "./VidaUtilFiltrosClient";

export const metadata = { title: "Vida Útil de Filtros - SIMOR" };

export default async function VidaUtilFiltrosPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  try {
    const estadoFiltros = await api.filterLifecycle.estado(cookieHeader);
    return <VidaUtilFiltrosClient initialData={estadoFiltros} />;
  } catch {
    redirect("/login");
  }
}
