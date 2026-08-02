import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import type { JornadaTrabajo, MedicionesAmbientales, Ajustes } from "@/types";
import CuadrillaClient from "./CuadrillaClient";

export const metadata = { title: "Estado de Cuadrilla - SIMOR" };

export default async function CuadrillaPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Vista de supervisión: el Trabajador tiene su propia vista personal.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.cargo === "Trabajador") redirect("/mi-historial");

  const [jornadas, alertas, trabajadoresPage] = await Promise.all([
    api.jornadas.activas(cookieHeader),
    api.alertas.activas(cookieHeader),
    api.trabajadores.listPaged(0, 200, cookieHeader),
  ]);
  const trabajadores = trabajadoresPage.content || [];

  const medMap: Record<string, MedicionesAmbientales | null> = {};
  const ajMap: Record<string, Ajustes | null> = {};
  await Promise.all(
    jornadas.map(async (j: JornadaTrabajo) => {
      const [med, aj] = await Promise.all([
        api.mediciones.latestByJornada(j.id, cookieHeader),
        api.mediciones.ajustesByJornada(j.id, cookieHeader).catch(() => null),
      ]);
      medMap[String(j.id)] = med;
      ajMap[String(j.id)] = aj;
    })
  );

  return (
    <CuadrillaClient
      initialJornadas={jornadas}
      initialAlertas={alertas}
      trabajadores={trabajadores}
      initialMediciones={medMap}
      initialAjustes={ajMap}
    />
  );
}
