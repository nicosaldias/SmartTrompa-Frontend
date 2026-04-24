import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import type { JornadaTrabajo, MedicionesAmbientales } from "@/types";
import CuadrillaClient from "./CuadrillaClient";

export const metadata = { title: "Estado de Cuadrilla - SIMOR" };

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

    const medMap: Record<string, MedicionesAmbientales | null> = {};
    await Promise.all(
      jornadas.map(async (j: JornadaTrabajo) => {
        medMap[String(j.id)] = await api.mediciones.latestByJornada(j.id, cookieHeader);
      })
    );

    return (
      <CuadrillaClient
        initialJornadas={jornadas}
        initialAlertas={alertas}
        trabajadores={trabajadores}
        initialMediciones={medMap}
      />
    );
  } catch {
    redirect("/login");
  }
}
