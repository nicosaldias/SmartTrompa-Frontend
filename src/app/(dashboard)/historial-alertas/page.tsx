import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import HistorialAlertasClient from "./HistorialAlertasClient";

export const metadata = { title: "Historial de Alertas - SIMOR" };

export default async function HistorialAlertasPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Vista de supervisión: el Trabajador tiene su propia vista personal.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.cargo === "Trabajador") redirect("/mi-historial");

  const pageData = await api.alertas.listPaged(0, 20, {}, cookieHeader);
  return <HistorialAlertasClient initialPage={pageData} />;
}
