import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import { puedeAdministrar, rutaInicial } from "@/utils/roles";
import AuditoriaClient from "./AuditoriaClient";

export const metadata = { title: "Auditoría - SIMOR" };

export default async function AuditoriaPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Página solo-admin (Administrador de su empresa o SuperAdministrador global):
  // ocultar el link del sidebar no basta si navegan directo.
  // Tokens válidos sin st_user = estado inconsistente → re-login lo repara.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!puedeAdministrar(user.cargo)) redirect(rutaInicial(user.cargo));

  const pageData = await api.auditLog.listPaged(0, 50, {}, cookieHeader);
  // El cargo viaja al client solo para decidir si mostrar la columna Empresa.
  return <AuditoriaClient initialPage={pageData} actorCargo={user.cargo} />;
}
