import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import TrabajadoresClient from "./TrabajadoresClient";

export const metadata = { title: "Trabajadores - SIMOR" };

export default async function TrabajadoresPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");

  const pageData = await api.trabajadores.listPaged(0, 20, cookieHeader);
  return <TrabajadoresClient initialPage={pageData} />;
}
