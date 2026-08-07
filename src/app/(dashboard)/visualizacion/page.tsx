import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import { esTrabajador } from "@/utils/roles";
import api from "@/api/client";
import VisualizacionClient from "./VisualizacionClient";

export const metadata = { title: "Historico de Cuadrilla - SIMOR" };

export default async function VisualizacionPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Vista de supervisión: el Trabajador tiene su propia vista personal.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (esTrabajador(user.cargo)) redirect("/mi-historial");

  // La lista se pasa completa: el selector de supervisores vive en
  // VisualizacionClient y su filtro literal (Supervisor || Administrador) ya
  // excluye al SuperAdministrador, que no debe figurar como supervisor de
  // jornadas (empresa null). No se pre-filtra aquí para no cambiar props.
  const trabajadoresPage = await api.trabajadores.listPaged(0, 200, cookieHeader);
  const trabajadores = trabajadoresPage.content || [];
  return <VisualizacionClient trabajadores={trabajadores} />;
}
