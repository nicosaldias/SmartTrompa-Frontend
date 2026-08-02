import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import VisualizacionClient from "./VisualizacionClient";

export const metadata = { title: "Historico de Cuadrilla - SIMOR" };

export default async function VisualizacionPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Vista de supervisión: el Trabajador tiene su propia vista personal.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.cargo === "Trabajador") redirect("/mi-historial");

  const trabajadoresPage = await api.trabajadores.listPaged(0, 200, cookieHeader);
  const trabajadores = trabajadoresPage.content || [];
  return <VisualizacionClient trabajadores={trabajadores} />;
}
