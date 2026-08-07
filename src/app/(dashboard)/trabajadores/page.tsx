import { redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/actions/auth";
import api from "@/api/client";
import { puedeAdministrar, esSuperAdmin, rutaInicial } from "@/utils/roles";
import type { Cargo, Empresa } from "@/types";
import TrabajadoresClient from "./TrabajadoresClient";

export const metadata = { title: "Trabajadores - SIMOR" };

export default async function TrabajadoresPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  // Página solo-Admin: ocultar el link del sidebar no basta si navegan directo.
  // Tokens válidos sin st_user = estado inconsistente → re-login lo repara.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Admin de su empresa o SuperAdministrador global; el resto vuelve a su home.
  if (!puedeAdministrar(user.cargo)) redirect(rutaInicial(user.cargo));

  const cargo = user.cargo as Cargo;
  // Solo el superadmin necesita el catálogo de empresas (columna, filtro y
  // select del form); para un admin normal el endpoint responde 403, así que
  // ni se intenta.
  const [pageData, empresas] = await Promise.all([
    api.trabajadores.listPaged(0, 20, cookieHeader),
    esSuperAdmin(cargo)
      ? api.empresas.list(cookieHeader)
      : Promise.resolve<Empresa[]>([]),
  ]);
  return <TrabajadoresClient initialPage={pageData} cargoActor={cargo} empresas={empresas} />;
}
