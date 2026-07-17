import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import RolesUbicacionesClient from "./RolesUbicacionesClient";

export const metadata = { title: "Roles y Ubicaciones - SIMOR" };

export default async function RolesUbicacionesPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Página solo-Admin: ocultar el link del sidebar no basta si navegan directo.
  // Tokens válidos sin st_user = estado inconsistente → re-login lo repara.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.cargo !== "Administrador") redirect("/resumen");

  const [roles, ubicaciones] = await Promise.all([
    api.roles.list(cookieHeader),
    api.ubicaciones.list(cookieHeader),
  ]);

  return (
    <RolesUbicacionesClient
      initialRoles={roles}
      initialUbicaciones={ubicaciones}
    />
  );
}
