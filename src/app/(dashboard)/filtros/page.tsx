import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import FiltrosClient from "./FiltrosClient";

export const metadata = { title: "Filtros y Respiradores - SIMOR" };

export default async function FiltrosPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Página solo-Admin: ocultar el link del sidebar no basta si navegan directo.
  const user = await getCurrentUser();
  if (user?.cargo !== "Administrador") redirect("/resumen");

  const [filtros, respiradores] = await Promise.all([
    api.tipoFiltros.listWithImages(cookieHeader),
    api.tipoRespiradores.listWithImages(cookieHeader),
  ]);
  return <FiltrosClient initialFiltros={filtros} initialRespiradores={respiradores} />;
}
