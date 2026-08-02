import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import AuditoriaClient from "./AuditoriaClient";

export const metadata = { title: "Auditoría - SIMOR" };

export default async function AuditoriaPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  const pageData = await api.auditLog.listPaged(0, 50, {}, cookieHeader);
  return <AuditoriaClient initialPage={pageData} />;
}
