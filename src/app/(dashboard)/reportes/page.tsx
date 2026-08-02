import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import ReportesClient from "./ReportesClient";

export const metadata = { title: "Reportes de Seguridad - SIMOR" };

export default async function ReportesPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Vista de supervisión: el Trabajador tiene su propia vista personal.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.cargo === "Trabajador") redirect("/mi-historial");

  const [alertasActivas, filtrosProximos, trabajadores] = await Promise.all([
    api.alertas.activas(cookieHeader),
    api.filterLifecycle.proximosVencer(cookieHeader),
    api.trabajadores.list(cookieHeader),
  ]);

  // Filtrar supervisores (cargo Supervisor o Administrador)
  const supervisores = trabajadores.filter(
    (t) => t.cargo === "Supervisor" || t.cargo === "Administrador"
  );

  // Vencidos aparte: "por vencer" minimiza cuando el parque ya está vencido.
  const filtrosVencidosCount = filtrosProximos.filter(
    (f) => f.nivelAlerta === "VENCIDO"
  ).length;

  return (
    <ReportesClient
      alertasActivasCount={alertasActivas.length}
      filtrosProximosCount={filtrosProximos.length}
      filtrosVencidosCount={filtrosVencidosCount}
      supervisores={supervisores}
      trabajadores={trabajadores}
    />
  );
}
