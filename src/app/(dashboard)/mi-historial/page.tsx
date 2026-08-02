import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import MiHistorialClient from "./MiHistorialClient";

export const metadata = { title: "Mi historial - SIMOR" };

export default async function MiHistorialPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Vista personal del Trabajador; los perfiles de supervisión tienen su dashboard.
  if (user.cargo !== "Trabajador") redirect("/resumen");

  // Filtro y umbrales pueden no existir aún para el trabajador (404): la vista
  // los muestra como vacío honesto, no como error.
  const [jornadas, alertas, filtro, umbrales] = await Promise.all([
    api.jornadas.byUsuario(user.rut, cookieHeader).catch(() => []),
    api.alertas.byTrabajador(user.rut, cookieHeader).catch(() => []),
    api.filterLifecycle.estadoByRut(user.rut, cookieHeader).catch(() => null),
    api.umbrales.lastByTrabajador(user.rut, cookieHeader).catch(() => null),
  ]);

  return (
    <MiHistorialClient
      rut={user.rut}
      initialJornadas={jornadas}
      initialAlertas={alertas}
      initialFiltro={filtro}
      initialUmbrales={umbrales}
    />
  );
}
