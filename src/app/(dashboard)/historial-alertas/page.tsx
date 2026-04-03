import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import HistorialAlertasClient from "./HistorialAlertasClient";

export const metadata = { title: "Historial de Alertas - Smart Trompa" };

export default async function HistorialAlertasPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");
  try {
    const pageData = await api.alertas.listPaged(0, 20, {}, cookieHeader);
    return <HistorialAlertasClient initialPage={pageData} />;
  } catch {
    redirect("/login");
  }
}
