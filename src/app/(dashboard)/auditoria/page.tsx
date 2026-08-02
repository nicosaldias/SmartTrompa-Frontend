import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import AuditoriaClient from "./AuditoriaClient";

export const metadata = { title: "Auditoría - SIMOR" };

export default async function AuditoriaPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Página solo-Admin: ocultar el link del sidebar no basta si navegan directo.
  // Tokens válidos sin st_user = estado inconsistente → re-login lo repara.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.cargo !== "Administrador") redirect("/resumen");

  const pageData = await api.auditLog.listPaged(0, 50, {}, cookieHeader);
  return <AuditoriaClient initialPage={pageData} />;
}
