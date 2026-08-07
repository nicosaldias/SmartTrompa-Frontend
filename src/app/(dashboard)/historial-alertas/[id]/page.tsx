import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import { esTrabajador } from "@/utils/roles";
import AlertaDetalleClient from "./AlertaDetalleClient";

export const metadata = { title: "Detalle de Alerta - SIMOR" };

export default async function AlertaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Vista de supervisión: el Trabajador tiene su propia vista personal.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (esTrabajador(user.cargo)) redirect("/mi-historial");
  const { id } = await params;
  return <AlertaDetalleClient alertaId={Number(id)} />;
}
