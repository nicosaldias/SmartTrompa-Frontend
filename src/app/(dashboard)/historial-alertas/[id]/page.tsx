import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import AlertaDetalleClient from "./AlertaDetalleClient";

export const metadata = { title: "Detalle de Alerta - SIMOR" };

export default async function AlertaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");
  const { id } = await params;
  return <AlertaDetalleClient alertaId={Number(id)} />;
}
