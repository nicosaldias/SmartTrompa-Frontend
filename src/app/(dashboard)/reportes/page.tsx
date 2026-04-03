import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import ReportesClient from "./ReportesClient";

export const metadata = { title: "Reportes de Seguridad - Smart Trompa" };

export default async function ReportesPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  try {
    // Pre-fetch summary stats for preview
    const [alertasActivas, filtrosProximos] = await Promise.all([
      api.alertas.activas(cookieHeader),
      api.filterLifecycle.proximosVencer(cookieHeader),
    ]);
    return (
      <ReportesClient
        alertasActivasCount={alertasActivas.length}
        filtrosProximosCount={filtrosProximos.length}
      />
    );
  } catch {
    redirect("/login");
  }
}
