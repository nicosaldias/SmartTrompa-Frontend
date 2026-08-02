import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import AlertaDetalleClient from "./AlertaDetalleClient";

export const metadata = { title: "Detalle de Alerta - SIMOR" };

export default async function AlertaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Vista de supervisión: el Trabajador tiene su propia vista personal.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.cargo === "Trabajador") redirect("/mi-historial");
  const { id } = await params;
  return <AlertaDetalleClient alertaId={Number(id)} />;
}
