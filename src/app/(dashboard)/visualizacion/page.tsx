import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import VisualizacionClient from "./VisualizacionClient";

export const metadata = { title: "Visualizacion de Cuadrilla - Smart Trompa" };

export default async function VisualizacionPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");
  try {
    const trabajadores = await api.trabajadores.list(cookieHeader);
    const supervisores = trabajadores.filter(
      (t) => t.cargo === "Supervisor" || t.cargo === "Administrador"
    );
    return <VisualizacionClient supervisores={supervisores} />;
  } catch {
    redirect("/login");
  }
}
