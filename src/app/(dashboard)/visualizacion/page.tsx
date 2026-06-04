import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import VisualizacionClient from "./VisualizacionClient";

export const metadata = { title: "Historico de Cuadrilla - SIMOR" };

export default async function VisualizacionPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  const trabajadoresPage = await api.trabajadores.listPaged(0, 200, cookieHeader);
  const trabajadores = trabajadoresPage.content || [];
  return <VisualizacionClient trabajadores={trabajadores} />;
}
