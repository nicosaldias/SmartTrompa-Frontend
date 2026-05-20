import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import type { JornadaTrabajo, MedicionesAmbientales } from "@/types";
import ResumenClient from "./ResumenClient";

export const metadata = { title: "Resumen - SIMOR" };

export default async function ResumenPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  try {
    const [jornadas, alertas] = await Promise.all([
      api.jornadas.activas(cookieHeader),
      api.alertas.activas(cookieHeader),
    ]);

    const medMap: Record<string, MedicionesAmbientales | null> = {};
    await Promise.all(
      jornadas.map(async (j: JornadaTrabajo) => {
        medMap[String(j.id)] = await api.mediciones.latestByJornada(j.id, cookieHeader);
      })
    );

    return (
      <ResumenClient
        initialJornadas={jornadas}
        initialAlertas={alertas}
        initialMediciones={medMap}
      />
    );
  } catch {
    redirect("/login");
  }
}
