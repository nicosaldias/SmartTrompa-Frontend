import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import { esSuperAdmin, rutaInicial } from "@/utils/roles";
import EmpresasClient from "./EmpresasClient";

export const metadata = { title: "Empresas - SIMOR" };

export default async function EmpresasPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Página solo-SuperAdmin: ocultar el link del sidebar no basta si navegan
  // directo. Un no-superadmin se redirige a su ruta inicial (no a /login,
  // porque su sesión es válida — solo no le corresponde esta pantalla).
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!esSuperAdmin(user.cargo)) redirect(rutaInicial(user.cargo));

  const empresas = await api.empresas.list(cookieHeader);

  return <EmpresasClient initialEmpresas={empresas} />;
}
