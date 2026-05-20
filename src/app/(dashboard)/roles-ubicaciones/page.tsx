import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import RolesUbicacionesClient from "./RolesUbicacionesClient";

export const metadata = { title: "Roles y Ubicaciones - SIMOR" };

export default async function RolesUbicacionesPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");
  try {
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
  } catch {
    redirect("/login");
  }
}
