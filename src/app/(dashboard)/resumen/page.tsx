import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import ResumenClient from "./ResumenClient";

export const metadata = { title: "Resumen - Smart Trompa" };

export default async function ResumenPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  try {
    const [jornadas, alertas] = await Promise.all([
      api.jornadas.activas(cookieHeader),
      api.alertas.activas(cookieHeader),
    ]);
    return <ResumenClient initialJornadas={jornadas} initialAlertas={alertas} />;
  } catch {
    redirect("/login");
  }
}
