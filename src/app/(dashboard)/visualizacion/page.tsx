import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import VisualizacionClient from "./VisualizacionClient";

export const metadata = { title: "Historico de Cuadrilla - SmartTrompa" };

export default async function VisualizacionPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");
  try {
    const trabajadoresPage = await api.trabajadores.listPaged(0, 200, cookieHeader);
    const trabajadores = trabajadoresPage.content || [];
    return <VisualizacionClient trabajadores={trabajadores} />;
  } catch (err) {
    console.error("Error cargando historico:", err);
    redirect("/login");
  }
}
