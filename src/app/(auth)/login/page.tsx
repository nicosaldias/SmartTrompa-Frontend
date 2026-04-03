"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction, forgotPasswordAction } from "@/actions/auth";
import { Wind, Eye, EyeOff, ArrowLeft, Shield, Users, Clock } from "lucide-react";

function formatRut(value: string) {
  const clean = value.replace(/[^0-9kK]/g, "").toLowerCase();
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  const bodyFormatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${bodyFormatted}-${dv}`;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  marginBottom: "0.5rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};

export default function LoginPage() {
  const router = useRouter();
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset password
  const [showReset, setShowReset] = useState(false);
  const [correo, setCorreo] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const rawRut = rut.replace(/\./g, "");
    const result = await loginAction(rawRut, password);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/resumen");
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await forgotPasswordAction(correo);
    setLoading(false);
    if (result?.error) {
      setResetMsg("Error: " + result.error);
    } else {
      setResetMsg("Revisa tu correo para restablecer tu contraseña");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "var(--color-bg-primary)",
      }}
    >
      {/* ==================== LEFT PANEL ==================== */}
      <div
        className="login-left-panel"
        style={{
          width: "55%",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "3rem 4rem",
          backgroundImage: "linear-gradient(to bottom, rgba(13, 17, 23, 0.8), rgba(22, 27, 34, 0.9)), url('/login-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#0d1117",
        }}
      >
        {/* Subtle orange glow */}
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            left: "-10%",
            width: "80%",
            height: "80%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "5%",
            width: "50%",
            height: "50%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        {/* Dark overlay simulating industrial image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(13,17,23,0.3) 0%, rgba(13,17,23,0.6) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 400 }}>
          {/* Logo */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: "0.875rem",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              marginBottom: "2.5rem",
              boxShadow: "0 8px 32px rgba(249,115,22,0.35)",
            }}
          >
            <Wind size={28} color="white" />
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "3rem",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
            }}
          >
            Smart Trompa
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "rgba(255,255,255,0.5)",
              fontWeight: 400,
              marginBottom: "3rem",
            }}
          >
            Plataforma de Gesti&oacute;n Industrial
          </p>

          {/* Feature bullets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {[
              { icon: <Shield size={20} />, text: "MONITOREO EN TIEMPO REAL" },
              { icon: <Users size={20} />, text: "GESTI\u00D3N DE CUADRILLAS" },
              { icon: <Clock size={20} />, text: "HISTORIAL DE ALERTAS" },
            ].map((item) => (
              <div
                key={item.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: "0.625rem",
                    background: "rgba(249,115,22,0.12)",
                    color: "var(--color-accent)",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.7)",
                    letterSpacing: "0.15em",
                  }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== RIGHT PANEL ==================== */}
      <div
        style={{
          width: "45%",
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "var(--color-bg-primary)",
        }}
        className="login-right-panel"
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Card */}
          <div
            className="card"
            style={{
              boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
              padding: "2.5rem",
            }}
          >
            {!showReset ? (
              <>
                <h2
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Iniciar sesi&oacute;n
                </h2>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "0.875rem",
                    marginBottom: "2rem",
                  }}
                >
                  Ingrese con tu RUT y contrase&ntilde;a
                </p>

                {error && (
                  <div
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: "0.5rem",
                      padding: "0.75rem",
                      color: "#f87171",
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {error}
                  </div>
                )}

                <form
                  onSubmit={handleLogin}
                  style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                >
                  {/* RUT */}
                  <div>
                    <label style={labelStyle}>RUT</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="12.345.678-9"
                      value={rut}
                      onChange={(e) => setRut(formatRut(e.target.value))}
                      maxLength={12}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <label
                        style={{
                          ...labelStyle,
                          marginBottom: 0,
                        }}
                      >
                        CONTRASE&Ntilde;A
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowReset(true)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-accent)",
                          fontSize: "0.7rem",
                          fontWeight: 500,
                          padding: 0,
                        }}
                      >
                        &iquest;Olvidaste tu contrase&ntilde;a?
                      </button>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type={showPass ? "text" : "password"}
                        placeholder="Tu contrase\u00F1a"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ paddingRight: "2.5rem" }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        style={{
                          position: "absolute",
                          right: "0.75rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-text-secondary)",
                          display: "flex",
                          padding: 0,
                        }}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    className="btn-primary"
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      marginTop: "0.5rem",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {loading ? "Iniciando sesi\u00F3n..." : "INGRESAR"}
                  </button>
                </form>
              </>
            ) : (
              /* ============ RESET PASSWORD FORM ============ */
              <>
                <button
                  onClick={() => {
                    setShowReset(false);
                    setResetMsg("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-secondary)",
                    fontSize: "0.8rem",
                    marginBottom: "1.5rem",
                    padding: 0,
                  }}
                >
                  <ArrowLeft size={14} /> Volver al login
                </button>

                <h2
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Restablecer contrase&ntilde;a
                </h2>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "0.875rem",
                    marginBottom: "2rem",
                  }}
                >
                  Ingresa tu correo y te enviaremos un enlace para crear una nueva
                  contrase&ntilde;a.
                </p>

                {resetMsg && (
                  <div
                    style={{
                      background: resetMsg.startsWith("Revisa")
                        ? "rgba(34,197,94,0.1)"
                        : "rgba(239,68,68,0.1)",
                      border: `1px solid ${
                        resetMsg.startsWith("Revisa")
                          ? "rgba(34,197,94,0.3)"
                          : "rgba(239,68,68,0.3)"
                      }`,
                      borderRadius: "0.5rem",
                      padding: "0.75rem",
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                      color: resetMsg.startsWith("Revisa") ? "#4ade80" : "#f87171",
                    }}
                  >
                    {resetMsg}
                  </div>
                )}

                <form
                  onSubmit={handleForgotPassword}
                  style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                >
                  <div>
                    <label style={labelStyle}>Correo electr&oacute;nico</label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="tu@correo.com"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    className="btn-primary"
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {loading ? "Enviando..." : "ENVIAR ENLACE"}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Footer text */}
          <p
            style={{
              textAlign: "center",
              color: "var(--color-text-secondary)",
              fontSize: "0.75rem",
              marginTop: "1.5rem",
              lineHeight: 1.5,
            }}
          >
            Solo supervisores y administradores tienen acceso a esta plataforma
          </p>
        </div>
      </div>

      {/* ==================== RESPONSIVE STYLES ==================== */}
      <style>{`
        @media (max-width: 768px) {
          .login-left-panel {
            display: none !important;
          }
          .login-right-panel {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
