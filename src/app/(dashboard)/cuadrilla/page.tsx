import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import CuadrillaClient from "./CuadrillaClient";

export const metadata = { title: "Estado de Cuadrilla - Smart Trompa" };

export default async function CuadrillaPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");
  try {
    const [jornadas, alertas, trabajadoresPage] = await Promise.all([
      api.jornadas.activas(cookieHeader),
      api.alertas.activas(cookieHeader),
      api.trabajadores.listPaged(0, 200, cookieHeader),
    ]);
    const trabajadores = trabajadoresPage.content || [];
    return <CuadrillaClient initialJornadas={jornadas} initialAlertas={alertas} trabajadores={trabajadores} />;
  } catch {
    redirect("/login");
  }
}
