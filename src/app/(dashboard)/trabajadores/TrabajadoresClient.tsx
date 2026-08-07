"use client";

import { useState, useMemo } from "react";
import { api, ApiError } from "@/api/client";
import { API_BASE_URL } from "@/api/endpoints";
import { Trabajador, TrabajadorRequest, Cargo, PageResponse, Empresa } from "@/types";
import { esSuperAdmin } from "@/utils/roles";
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, Upload } from "lucide-react";
import Swal from "sweetalert2";
import { useT } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/types";
import { confirmCascadeDelete, confirmDeleteWithImpact } from "@/utils/cascadeDelete";

function CharCounter({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  const color = pct >= 1 ? "#ef4444" : pct >= 0.8 ? "#f59e0b" : "var(--color-text-secondary)";
  return (
    <span style={{ display: "block", textAlign: "right", fontSize: "0.65rem", color, marginTop: "0.25rem" }}>
      {current}/{max}
    </span>
  );
}

interface Props {
  initialPage: PageResponse<Trabajador>;
  /** Cargo del actor logueado: decide columna/filtro/select de empresa y cargos ofrecibles. */
  cargoActor: Cargo;
  /** Catálogo de empresas; solo llega poblado para SuperAdministrador (el endpoint es 403 para el resto). */
  empresas?: Empresa[];
}

const CARGOS: Cargo[] = ["Administrador", "Supervisor", "Trabajador"];

const CARGO_BADGE: Record<Cargo, string> = {
  SuperAdministrador: "badge-red",
  Administrador: "badge-blue",
  Supervisor: "badge-yellow",
  Trabajador: "badge-gray",
};

const CARGO_I18N_KEY = {
  SuperAdministrador: "roles.superadmin",
  Administrador: "roles.administrator",
  Supervisor: "roles.supervisor",
  Trabajador: "roles.worker",
} as const satisfies Record<Cargo, TranslationKey>;

function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, "").toLowerCase();
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

function cleanRut(formatted: string): string {
  return formatted.replace(/[.\-]/g, "");
}

function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

const PAGE_SIZE = 20;

export default function TrabajadoresClient({ initialPage, cargoActor, empresas = [] }: Props) {
  const t = useT();
  // Un admin normal jamás ve UI de empresas: su alcance lo fuerza el backend.
  const actorEsSuperAdmin = esSuperAdmin(cargoActor);
  // SuperAdministrador solo es asignable por otro superadmin (el backend
  // responde 403 si un admin lo intenta), así que ni se ofrece la opción.
  const cargosDisponibles: Cargo[] = actorEsSuperAdmin ? ["SuperAdministrador", ...CARGOS] : CARGOS;
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>(initialPage.content);
  const [totalElements, setTotalElements] = useState(initialPage.totalElements);
  const [totalPages, setTotalPages] = useState(initialPage.totalPages);
  const [currentPage, setCurrentPage] = useState(initialPage.number);
  const [search, setSearch] = useState("");
  const [cargoFilter, setCargoFilter] = useState<Cargo | "">("");
  const [empresaFilter, setEmpresaFilter] = useState<number | "">("");
  const [soloActivos, setSoloActivos] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingTrabajador, setEditingTrabajador] = useState<Trabajador | null>(null);

  // Form fields
  const [formRut, setFormRut] = useState("");
  const [formNombre, setFormNombre] = useState("");
  const [formApellidoPaterno, setFormApellidoPaterno] = useState("");
  const [formApellidoMaterno, setFormApellidoMaterno] = useState("");
  const [formCorreo, setFormCorreo] = useState("");
  const [formCargo, setFormCargo] = useState<Cargo>("Trabajador");
  // "" = sin elegir; solo superadmin ve/usa este campo.
  const [formEmpresaId, setFormEmpresaId] = useState<number | "">("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function getFieldError(field: string, value: string): string | null {
    if (!touched[field]) return null;
    switch (field) {
      case "rut": return value.length < 3 ? t("trabajadores.validation.rutInvalid") : null;
      case "nombre": return !value.trim() ? t("trabajadores.validation.nombreRequired") : null;
      case "apellidoPaterno": return !value.trim() ? t("trabajadores.validation.apellidoRequired") : null;
      case "correo": return value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? t("trabajadores.validation.correoInvalid") : null;
      case "password": return value && value.length < 6 ? t("trabajadores.validation.passwordMin") : null;
      default: return null;
    }
  }

  async function fetchPage(page: number) {
    try {
      const data = await api.trabajadores.listPaged(page, PAGE_SIZE);
      setTrabajadores(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
      setCurrentPage(data.number);
    } catch (err) {
      console.error("Error cargando trabajadores", err);
    }
  }

  async function refreshList() {
    await fetchPage(currentPage);
  }

  function handlePageChange(page: number) {
    fetchPage(page);
  }

  // Client-side filtering on current page data
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return trabajadores.filter((t) => {
      if (soloActivos && !t.activo) return false;
      if (cargoFilter && t.cargo !== cargoFilter) return false;
      // Filtro por empresa: solo superadmin lo ve; el resto recibe la lista ya
      // scoped por el backend, así que empresaFilter queda siempre en "".
      if (empresaFilter !== "" && t.empresa?.id !== empresaFilter) return false;
      if (term) {
        const fullName = `${t.nombre} ${t.apellidoPaterno} ${t.apellidoMaterno}`.toLowerCase();
        const rut = t.rut.toLowerCase();
        const correo = t.correo.toLowerCase();
        if (!fullName.includes(term) && !rut.includes(term) && !correo.includes(term)) return false;
      }
      return true;
    });
  }, [trabajadores, search, cargoFilter, empresaFilter, soloActivos]);

  const paginated = filtered;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: t("common.error"), text: t("trabajadores.imageTooLarge"), background: "var(--color-bg-card)", color: "var(--color-text-primary)" });
      return;
    }
    setFormImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setFormImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function openCreate() {
    setEditingTrabajador(null);
    setFormRut("");
    setFormNombre("");
    setFormApellidoPaterno("");
    setFormApellidoMaterno("");
    setFormCorreo("");
    setFormCargo("Trabajador");
    setFormEmpresaId("");
    setFormPassword("");
    setFormConfirmPassword("");
    setFormImageFile(null);
    setFormImagePreview(null);
    setTouched({});
    setShowModal(true);
  }

  function openEdit(t: Trabajador) {
    setEditingTrabajador(t);
    setFormRut(formatRut(t.rut));
    setFormNombre(t.nombre);
    setFormApellidoPaterno(t.apellidoPaterno);
    setFormApellidoMaterno(t.apellidoMaterno);
    setFormCorreo(t.correo);
    setFormCargo(t.cargo);
    setFormEmpresaId(t.empresa?.id ?? "");
    setFormPassword("");
    setFormConfirmPassword("");
    if (t.tieneImagen) {
      setFormImagePreview(`${API_BASE_URL}/trabajador/${t.rut}/imagen/`);
    } else {
      setFormImagePreview(null);
    }
    setFormImageFile(null);
    setTouched({});
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (formPassword && formPassword !== formConfirmPassword) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: t("trabajadores.passwordsDoNotMatch"),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: t("common.confirm"),
      text: editingTrabajador ? t("trabajadores.recordWillBeUpdated") : t("trabajadores.recordWillBeCreated"),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("trabajadores.yesSave"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      confirmButtonColor: "#f97316",
    });
    if (!confirmResult.isConfirmed) return;

    // Solo el superadmin manda empresa (y solo si eligió una): para un admin
    // normal el backend fuerza SU empresa y un payload ajeno le vale 403.
    const empresaPayload: Pick<TrabajadorRequest, "empresa"> | Record<string, never> =
      actorEsSuperAdmin && formEmpresaId !== "" ? { empresa: { id: formEmpresaId } } : {};

    try {
      if (editingTrabajador) {
        const updateData: Partial<TrabajadorRequest> = {
          nombre: formNombre,
          apellidoPaterno: formApellidoPaterno,
          apellidoMaterno: formApellidoMaterno,
          correo: formCorreo,
          cargo: formCargo,
          ...(formPassword ? { password: formPassword } : {}),
          ...empresaPayload,
        };
        await api.trabajadores.update(editingTrabajador.rut, updateData, formImageFile || undefined);
      } else {
        const createData: TrabajadorRequest = {
          rut: formRut,
          nombre: formNombre,
          apellidoPaterno: formApellidoPaterno,
          apellidoMaterno: formApellidoMaterno,
          correo: formCorreo,
          cargo: formCargo,
          password: formPassword,
          ...empresaPayload,
        };
        await api.trabajadores.create(createData, formImageFile || undefined);
      }
      setShowModal(false);
      await refreshList();
      Swal.fire({
        icon: "success",
        title: editingTrabajador ? t("trabajadores.workerUpdated") : t("trabajadores.workerCreated"),
        timer: 1500,
        showConfirmButton: false,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: (err as Error).message,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    }
  }

  async function handleToggleActivo(trab: Trabajador) {
    const result = await Swal.fire({
      title: trab.activo ? t("trabajadores.deactivateTitle") : t("trabajadores.activateTitle"),
      text: trab.activo
        ? t("trabajadores.deactivateText")
        : t("trabajadores.activateText"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: trab.activo ? t("trabajadores.yesDeactivate") : t("trabajadores.yesActivate"),
      cancelButtonText: t("common.cancel"),
      background: "var(--color-bg-card)",
      color: "var(--color-text-primary)",
      confirmButtonColor: trab.activo ? "#ef4444" : "#22c55e",
    });
    if (result.isConfirmed) {
      try {
        await api.trabajadores.toggleActivo(trab.rut);
        await refreshList();
      } catch (err: unknown) {
        Swal.fire({
          icon: "error",
          title: t("common.error"),
          text: (err as Error).message,
          background: "var(--color-bg-card)",
          color: "var(--color-text-primary)",
        });
      }
    }
  }

  async function handleDelete(trab: Trabajador) {
    const nombre = `${trab.nombre} ${trab.apellidoPaterno}`;
    const fetchRelaciones = () => api.trabajadores.relaciones(trab.rut);
    const cascadeDelete = () => api.trabajadores.deleteCascade(trab.rut);
    const notaAlcance = t("cascade.scopeSupervisorNote");
    const exitoCascada = async () => {
      await refreshList();
      Swal.fire({
        icon: "success",
        title: t("cascade.deletedTitle"),
        text: t("cascade.deletedText", { name: nombre }),
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });
    };
    const mostrarError = (msg: string) =>
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: msg,
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
      });

    // Vista previa de impacto SIEMPRE antes de borrar: muestra a qué afecta
    // (incluidas las jornadas supervisadas). No ejecuta el borrado.
    const decision = await confirmDeleteWithImpact({ nombre, fetchRelaciones, notaAlcance, t });
    if (decision === "cancel") return;
    try {
      if (decision === "cascade") {
        await cascadeDelete();
        await exitoCascada();
      } else {
        await api.trabajadores.delete(trab.rut);
        await refreshList();
        Swal.fire({
          icon: "success",
          title: t("trabajadores.deleted"),
          timer: 1500,
          showConfirmButton: false,
          background: "var(--color-bg-card)",
          color: "var(--color-text-primary)",
        });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        // El guard anti-lockout (propia cuenta / único Administrador de la
        // empresa / único SuperAdministrador del sistema) responde 409 con un
        // detail distinto al de FK ("...registros relacionados...", fijo del
        // GlobalExceptionHandler): ahí se muestra el motivo directo, sin cascada.
        const esPorRelaciones = (err.detail ?? err.message ?? "").includes("registros relacionados");
        if (!esPorRelaciones) {
          mostrarError(err.message);
          return;
        }
        // TOCTOU en el camino simple: aparecieron relaciones → ofrecer cascada.
        try {
          const deleted = await confirmCascadeDelete({ nombre, fetchRelaciones, cascadeDelete, notaAlcance, t });
          if (deleted) await exitoCascada();
        } catch (err2: unknown) {
          mostrarError((err2 as Error).message);
        }
        return;
      }
      mostrarError((err as Error).message);
    }
  }

  return (
    <div>
      {/* Header */}
      <div
        className="trabajadores-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 className="trabajadores-title" style={{ fontSize: "1.5rem", fontWeight: 800 }}>{t("trabajadores.title")}</h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            {t("trabajadores.subtitle")}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={openCreate}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Plus size={16} /> {t("trabajadores.newWorker")}
        </button>
      </div>

      {/* Filters row */}
      <div
        className="trabajadores-filters"
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 360 }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-secondary)",
            }}
          />
          <input
            className="input-field"
            style={{ paddingLeft: "2.25rem" }}
            placeholder={t("trabajadores.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Cargo filter */}
        <select
          className="input-field"
          style={{ width: 180 }}
          value={cargoFilter}
          onChange={(e) => setCargoFilter(e.target.value as Cargo | "")}
        >
          <option value="">{t("trabajadores.allPositions")}</option>
          {cargosDisponibles.map((c) => (
            <option key={c} value={c}>
              {t(CARGO_I18N_KEY[c])}
            </option>
          ))}
        </select>

        {/* Filtro por empresa: solo superadmin (los demás ya reciben la lista scoped) */}
        {actorEsSuperAdmin && (
          <select
            className="input-field"
            style={{ width: 200 }}
            value={empresaFilter}
            onChange={(e) => setEmpresaFilter(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">{t("trabajadores.allCompanies")}</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre}
              </option>
            ))}
          </select>
        )}

        {/* Solo activos toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.875rem",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <div
            onClick={() => setSoloActivos(!soloActivos)}
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              backgroundColor: soloActivos ? "var(--color-accent)" : "var(--color-border)",
              position: "relative",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: "white",
                position: "absolute",
                top: 2,
                left: soloActivos ? 18 : 2,
                transition: "left 0.2s",
              }}
            />
          </div>
          {t("trabajadores.onlyActive")}
        </label>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="trabajadores-table-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {[
                  { key: "worker", label: t("trabajadores.tableWorker") },
                  { key: "position", label: t("trabajadores.tablePosition") },
                  // Columna Empresa solo en vista global: para un admin normal
                  // todos serían de su propia empresa (ruido sin información).
                  ...(actorEsSuperAdmin ? [{ key: "company", label: t("trabajadores.tableCompany") }] : []),
                  { key: "contact", label: t("trabajadores.tableContact") },
                  { key: "status", label: t("trabajadores.tableStatus") },
                  { key: "actions", label: t("trabajadores.tableActions") },
                ].map((h) => (
                  <th
                    key={h.key}
                    style={{
                      padding: "0.75rem 0.5rem",
                      textAlign: h.key === "worker" ? "left" : "center",
                      color: "var(--color-text-secondary)",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={actorEsSuperAdmin ? 6 : 5}
                    style={{
                      padding: "2.5rem",
                      textAlign: "center",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("trabajadores.noResults")}
                  </td>
                </tr>
              ) : (
                paginated.map((trab) => (
                  <tr
                    key={trab.rut}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      transition: "background-color 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "rgba(249,115,22,0.03)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {/* TRABAJADOR column: avatar + name + rut */}
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {trab.tieneImagen ? (
                          <img
                            src={`${API_BASE_URL}/trabajador/${trab.rut}/imagen/`}
                            alt=""
                            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #f97316, #ea580c)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              // Iniciales sobre el gradiente naranja: el blanco daba 2.80:1
                              // contra #f97316 y 3.56:1 contra #ea580c, y --color-on-accent
                              // deja 5.91:1 y 4.65:1. El `color: "white"` de la línea 785
                              // se queda como está: ese vive sobre rgba(0,0,0,0.5).
                              color: "var(--color-on-accent)",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(trab.nombre, trab.apellidoPaterno)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {trab.nombre} {trab.apellidoPaterno} {trab.apellidoMaterno}
                          </div>
                          <div
                            style={{
                              color: "var(--color-text-secondary)",
                              fontSize: "0.8rem",
                              marginTop: "0.125rem",
                            }}
                          >
                            {formatRut(trab.rut)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* CARGO */}
                    <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                      <span className={CARGO_BADGE[trab.cargo]}>{t(CARGO_I18N_KEY[trab.cargo])}</span>
                    </td>

                    {/* EMPRESA (solo vista global del superadmin) */}
                    {actorEsSuperAdmin && (
                      <td
                        style={{
                          padding: "0.75rem 0.5rem",
                          textAlign: "center",
                          color: trab.empresa ? undefined : "var(--color-text-secondary)",
                        }}
                      >
                        {trab.empresa?.nombre ?? t("trabajadores.noCompany")}
                      </td>
                    )}

                    {/* CONTACTO */}
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        textAlign: "center",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {trab.correo}
                    </td>

                    {/* ESTADO */}
                    <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                      <span className={trab.activo ? "badge-green" : "badge-red"}>
                        {trab.activo ? t("trabajadores.active") : t("trabajadores.inactive")}
                      </span>
                    </td>

                    {/* ACCIONES */}
                    <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                        <button
                          onClick={() => openEdit(trab)}
                          className="btn-secondary"
                          style={{ padding: "0.375rem" }}
                          title={t("common.edit")}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActivo(trab)}
                          className="btn-secondary"
                          style={{
                            padding: "0.375rem",
                            borderColor: trab.activo
                              ? "rgba(239,68,68,0.3)"
                              : "rgba(34,197,94,0.3)",
                            color: trab.activo ? "#ef4444" : "#22c55e",
                          }}
                          title={trab.activo ? t("trabajadores.deactivate") : t("trabajadores.activate")}
                        >
                          {trab.activo ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(trab)}
                          className="btn-secondary"
                          style={{
                            padding: "0.375rem",
                            borderColor: "rgba(239,68,68,0.3)",
                            color: "#ef4444",
                          }}
                          title={t("common.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.75rem 1rem",
              borderTop: "1px solid var(--color-border)",
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
            }}
          >
            <span>
              {t("trabajadores.paginationShowing", {
                from: currentPage * PAGE_SIZE + 1,
                to: Math.min((currentPage + 1) * PAGE_SIZE, totalElements),
                total: totalElements,
              })}
            </span>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              <button
                className="btn-secondary"
                style={{ padding: "0.25rem 0.625rem", fontSize: "0.8rem" }}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
              >
                {t("common.previous")}
              </button>
              {Array.from({ length: totalPages }, (_, i) => i).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  style={{
                    padding: "0.25rem 0.625rem",
                    fontSize: "0.8rem",
                    borderRadius: "0.375rem",
                    border:
                      page === currentPage
                        ? "1px solid var(--color-accent)"
                        : "1px solid var(--color-border)",
                    // El relleno baja del 15 % al 6 %, el mismo valor al que globals.css
                    // dejó --badge-tint y por el mismo motivo: con 0.15 resuelto contra
                    // .card blanco el fondo daba #feeadc y orange-700 encima medía 4.44:1,
                    // 0.06 por debajo del 4.5 de AA para texto normal. Con 0.06 el fondo
                    // queda en #fff7f1 y la tinta sube a 4.89:1. En tema oscuro también
                    // mejora (4.55:1 → 5.19:1 sobre .card #1c2333), así que no hay que
                    // condicionar por tema. Lo que se aclara es el RELLENO, no la tinta:
                    // el número sigue señalado por el borde --color-accent y por el peso
                    // 600, que no dependen de la opacidad.
                    backgroundColor:
                      page === currentPage ? "rgba(249,115,22,0.06)" : "transparent",
                    color:
                      page === currentPage
                        ? "var(--color-accent-text)"
                        : "var(--color-text-secondary)",
                    cursor: "pointer",
                    fontWeight: page === currentPage ? 600 : 400,
                  }}
                >
                  {page + 1}
                </button>
              ))}
              <button
                className="btn-secondary"
                style={{ padding: "0.25rem 0.625rem", fontSize: "0.8rem" }}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                {t("common.next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            className="card modal-content modal-trabajadores"
            style={{ width: "100%", maxWidth: 960, maxHeight: "90vh", overflowY: "auto" }}
          >
            <h2 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1.5rem" }}>
              {editingTrabajador ? t("trabajadores.editWorker") : t("trabajadores.newWorker")}
            </h2>
            <form
              onSubmit={handleSave}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* Profile image upload zone */}
              <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    margin: "0 auto 0.75rem",
                    overflow: "hidden",
                    border: "2px dashed var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "var(--color-bg-primary)",
                    cursor: "pointer",
                    position: "relative",
                    transition: "border-color 0.2s",
                  }}
                  onClick={() => document.getElementById("trabajador-imagen-input")?.click()}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#f97316"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
                >
                  {formImagePreview ? (
                    <>
                      <img src={formImagePreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{
                        position: "absolute", inset: 0,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0, transition: "opacity 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
                      >
                        <span style={{ color: "white", fontSize: "0.75rem", fontWeight: 600 }}>{t("trabajadores.change")}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "0.5rem" }}>
                      <Upload size={24} color="var(--color-text-secondary)" style={{ margin: "0 auto 0.375rem" }} />
                      <p style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                        {t("trabajadores.uploadImage")}
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="trabajador-imagen-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
                <p style={{ fontSize: "0.6rem", color: "var(--color-text-secondary)" }}>
                  {t("trabajadores.imageFormats")}
                </p>
              </div>

              {/* Section: Datos personales */}
              <div>
                <p style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--color-text-secondary)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                  paddingBottom: "0.375rem",
                  borderBottom: "1px solid var(--color-border)",
                }}>
                  {t("trabajadores.sectionPersonalData")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* RUT - full width */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        color: "var(--color-text-secondary)",
                        marginBottom: "0.375rem",
                      }}
                    >
                      {t("common.rut")}
                    </label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="12.345.678-9"
                      value={formRut}
                      onChange={(e) => setFormRut(formatRut(e.target.value))}
                      onBlur={() => setTouched(prev => ({ ...prev, rut: true }))}
                      disabled={!!editingTrabajador}
                      required
                      maxLength={12}
                      style={editingTrabajador ? { opacity: 0.6, cursor: "not-allowed" } : { borderColor: getFieldError("rut", cleanRut(formRut)) ? "#ef4444" : undefined }}
                    />
                    <CharCounter current={cleanRut(formRut).length} max={12} />
                    {getFieldError("rut", cleanRut(formRut)) && (
                      <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                        {getFieldError("rut", cleanRut(formRut))}
                      </span>
                    )}
                  </div>

                  {/* Nombre | Apellido Paterno */}
                  <div className="trabajadores-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "0.375rem",
                        }}
                      >
                        {t("trabajadores.firstName")}
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, nombre: true }))}
                        required
                        maxLength={100}
                        style={{ borderColor: getFieldError("nombre", formNombre) ? "#ef4444" : undefined }}
                      />
                      <CharCounter current={formNombre.length} max={100} />
                      {getFieldError("nombre", formNombre) && (
                        <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                          {getFieldError("nombre", formNombre)}
                        </span>
                      )}
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "0.375rem",
                        }}
                      >
                        {t("trabajadores.lastNamePaternal")}
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={formApellidoPaterno}
                        onChange={(e) => setFormApellidoPaterno(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, apellidoPaterno: true }))}
                        required
                        maxLength={100}
                        style={{ borderColor: getFieldError("apellidoPaterno", formApellidoPaterno) ? "#ef4444" : undefined }}
                      />
                      <CharCounter current={formApellidoPaterno.length} max={100} />
                      {getFieldError("apellidoPaterno", formApellidoPaterno) && (
                        <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                          {getFieldError("apellidoPaterno", formApellidoPaterno)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Apellido Materno | Correo */}
                  <div className="trabajadores-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "0.375rem",
                        }}
                      >
                        {t("trabajadores.lastNameMaternal")}
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        value={formApellidoMaterno}
                        onChange={(e) => setFormApellidoMaterno(e.target.value)}
                        required
                        maxLength={100}
                      />
                      <CharCounter current={formApellidoMaterno.length} max={100} />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "0.375rem",
                        }}
                      >
                        {t("trabajadores.email")}
                      </label>
                      <input
                        className="input-field"
                        type="email"
                        value={formCorreo}
                        onChange={(e) => setFormCorreo(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, correo: true }))}
                        required
                        maxLength={150}
                        style={{ borderColor: getFieldError("correo", formCorreo) ? "#ef4444" : undefined }}
                      />
                      <CharCounter current={formCorreo.length} max={150} />
                      {getFieldError("correo", formCorreo) && (
                        <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                          {getFieldError("correo", formCorreo)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Acceso */}
              <div>
                <p style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--color-text-secondary)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                  paddingBottom: "0.375rem",
                  borderBottom: "1px solid var(--color-border)",
                }}>
                  {t("trabajadores.sectionAccess")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Cargo - full width */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        color: "var(--color-text-secondary)",
                        marginBottom: "0.375rem",
                      }}
                    >
                      {t("trabajadores.position")}
                    </label>
                    <select
                      className="input-field"
                      value={formCargo}
                      onChange={(e) => setFormCargo(e.target.value as Cargo)}
                    >
                      {cargosDisponibles.map((c) => (
                        <option key={c} value={c}>
                          {t(CARGO_I18N_KEY[c])}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Empresa: solo superadmin la elige; para un admin normal el
                      backend fuerza la suya, así que el campo ni se muestra. */}
                  {actorEsSuperAdmin && (
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "0.375rem",
                        }}
                      >
                        {t("trabajadores.company")}
                      </label>
                      <select
                        className="input-field"
                        value={formEmpresaId}
                        onChange={(e) => setFormEmpresaId(e.target.value === "" ? "" : Number(e.target.value))}
                      >
                        <option value="">{t("trabajadores.companyPlaceholder")}</option>
                        {empresas.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Contrasena | Confirmar contrasena */}
                  <div className="trabajadores-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "0.375rem",
                        }}
                      >
                        {t("trabajadores.password")}
                      </label>
                      <input
                        className="input-field"
                        type="password"
                        placeholder={editingTrabajador ? t("trabajadores.passwordKeepBlank") : ""}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                        required={!editingTrabajador}
                        style={{ borderColor: getFieldError("password", formPassword) ? "#ef4444" : undefined }}
                      />
                      {getFieldError("password", formPassword) && (
                        <span style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.125rem", display: "block" }}>
                          {getFieldError("password", formPassword)}
                        </span>
                      )}
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "0.375rem",
                        }}
                      >
                        {t("trabajadores.confirmPassword")}
                      </label>
                      <input
                        className="input-field"
                        type="password"
                        placeholder={editingTrabajador ? t("trabajadores.passwordKeepBlank") : ""}
                        value={formConfirmPassword}
                        onChange={(e) => setFormConfirmPassword(e.target.value)}
                        required={!editingTrabajador}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1 }}
                >
                  {t("common.cancel")}
                </button>
                <button className="btn-primary" type="submit" style={{ flex: 1 }}>
                  {t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 1024px) {
          .trabajadores-table-wrap {
            overflow-x: auto !important;
          }
        }
        @media (max-width: 768px) {
          .trabajadores-header {
            flex-wrap: wrap !important;
            gap: 0.75rem !important;
            margin-bottom: 1rem !important;
          }
          .trabajadores-title {
            font-size: 1.25rem !important;
          }
          .trabajadores-filters {
            gap: 0.5rem !important;
          }
          .trabajadores-form-grid {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          .modal-trabajadores {
            max-width: 95vw !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            padding: 1rem !important;
          }
          .trabajadores-table-wrap {
            overflow-x: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
