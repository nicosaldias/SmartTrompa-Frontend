import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { rutaInicial } from "@/utils/roles";

export default async function Home() {
  // Cada cargo aterriza en su vista inicial (superadmin → /empresas,
  // trabajador → /mi-historial, resto → /resumen). Sin st_user se mantiene
  // el destino histórico: el middleware intercepta y manda a /login.
  const user = await getCurrentUser();
  redirect(user ? rutaInicial(user.cargo) : "/resumen");
}
