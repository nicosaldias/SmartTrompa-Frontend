import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import { puedeAdministrar } from "@/utils/roles";
import api from "@/api/client";
import FiltrosClient from "./FiltrosClient";

export const metadata = { title: "Filtros y Respiradores - SIMOR" };

export default async function FiltrosPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Página admin-only (Administrador o SuperAdministrador): ocultar el link
  // del sidebar no basta si navegan directo.
  // Tokens válidos sin st_user = estado inconsistente → re-login lo repara.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!puedeAdministrar(user.cargo)) redirect("/resumen");

  // Lista liviana: las imágenes ya no viajan en el JSON (el cliente las pide
  // por URL con lazy loading), así la vista renderiza aunque la conexión sea lenta.
  const [filtros, respiradores] = await Promise.all([
    api.tipoFiltros.list(cookieHeader),
    api.tipoRespiradores.list(cookieHeader),
  ]);
  return <FiltrosClient initialFiltros={filtros} initialRespiradores={respiradores} />;
}
