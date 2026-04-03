import { redirect } from "next/navigation";
import { getCookieHeader } from "@/actions/auth";
import api from "@/api/client";
import TrabajadoresClient from "./TrabajadoresClient";

export const metadata = { title: "Trabajadores - Smart Trompa" };

export default async function TrabajadoresPage() {
  const cookieHeader = await getCookieHeader();
  if (!cookieHeader) redirect("/login");
  try {
    const pageData = await api.trabajadores.listPaged(0, 20, cookieHeader);
    return <TrabajadoresClient initialPage={pageData} />;
  } catch {
    redirect("/login");
  }
}
