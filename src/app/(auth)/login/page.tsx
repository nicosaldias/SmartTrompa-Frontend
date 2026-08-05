"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction, forgotPasswordAction } from "@/actions/auth";
import { Wind, Eye, EyeOff, ArrowLeft, Shield, Users, Clock, Sun, Moon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import { useTheme } from "@/theme/ThemeProvider";

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
  const { lang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset password
  const [showReset, setShowReset] = useState(false);
  const [correo, setCorreo] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const resetIsSuccess = resetMsg === t("login.resetSuccess");
  const bgImage = lang === "en" ? "/fondo-login-en.png" : "/fondo-login-es.png";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await loginAction(rut, password);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        // El Trabajador tiene su vista personal; supervisión va al dashboard.
        router.push(result?.cargo === "Trabajador" ? "/mi-historial" : "/resumen");
      }
    } catch {
      setError(t("login.unexpectedError"));
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await forgotPasswordAction(correo);
    setLoading(false);
    if (result?.error) {
      setResetMsg(t("login.resetError") + result.error);
    } else {
      setResetMsg(t("login.resetSuccess"));
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
          width: "68%",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-end",
          padding: "3rem 5rem 3rem 3rem",
          background: "#0d1117",
        }}
      >
        {/* Imagen de fondo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url('${bgImage}')`,
            backgroundSize: "cover",
            backgroundPosition: "left center",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
          }}
        />

        {/* Overlay oscuro para legibilidad */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(13,17,23,0.55) 0%, rgba(13,17,23,0.75) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Glow naranja sutil */}
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            left: "-10%",
            width: "80%",
            height: "80%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 65%)",
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
            background: "radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        {/* Content wrapper (mirror del wrapper derecho) */}
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
        <div
          style={{
            textAlign: "center",
            width: "100%",
            minHeight: 408,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "rgba(13, 17, 23, 0.36)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "1.25rem",
            padding: "2.5rem",
            boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
          }}
        >
          {/* Logo + Title alineados */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              marginBottom: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: "0.875rem",
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                boxShadow: "0 8px 32px rgba(249,115,22,0.35)",
                flexShrink: 0,
              }}
            >
              {/* El ícono va sobre el cuadro naranja #f97316→#ea580c de la línea 187,
                  donde el blanco daba 2.80:1 / 3.56:1 (bajo el 3:1 de AA para
                  gráficos en el extremo claro); --color-on-accent lo deja en
                  5.91:1 / 4.65:1. Se pasa por `style` y no por el prop `color=`
                  porque lucide vuelca ese prop en el atributo stroke="", donde
                  var() no resuelve en todos los motores; sin él el trazo queda en
                  currentColor y hereda el style. */}
              <Wind size={28} style={{ color: "var(--color-on-accent)" }} />
            </div>
            {/* El #ffffff del título NO se toca: no vive sobre el naranja sino sobre
                el panel rgba(13,17,23,0.36) de la línea 160, encima del overlay
                oscuro rgba(13,17,23,0.55→0.75) de la 119. Ese fondo es oscuro en
                los dos temas y el blanco es justamente lo que corresponde. */}
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1,
                margin: 0,
              }}
            >
              {t("branding.appName")}
            </h1>
          </div>
          <p
            style={{
              fontSize: "1.1rem",
              color: "rgba(255,255,255,0.5)",
              fontWeight: 400,
              marginBottom: "3rem",
            }}
          >
            {t("branding.appTagline")}
          </p>

          {/* Feature bullets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {[
              { icon: <Shield size={20} />, text: t("branding.feature1") },
              { icon: <Users size={20} />, text: t("branding.feature2") },
              { icon: <Clock size={20} />, text: t("branding.feature3") },
            ].map((item) => (
              <div
                key={item.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                {/* Se queda con --color-accent a propósito: este chip vive sobre el hero
                    con imagen + overlay rgba(13,17,23,0.55→0.75) (líneas 119-122), que es
                    oscuro en ambos temas. Acá el naranja puro rinde >5:1; el token -text
                    (orange-700) lo apagaría contra ese fondo sin ganar nada. */}
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
        {/* Spacer invisible que iguala el footer "Solo supervisores..." del lado derecho */}
        <p
          aria-hidden="true"
          style={{
            visibility: "hidden",
            fontSize: "0.75rem",
            marginTop: "1.5rem",
            lineHeight: 1.5,
            margin: "1.5rem 0 0 0",
          }}
        >
          {t("login.footerNote")}
        </p>
        </div>
      </div>

      {/* ==================== RIGHT PANEL ==================== */}
      <div
        style={{
          width: "32%",
          minWidth: 360,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "var(--color-bg-primary)",
        }}
        className="login-right-panel"
      >
        {/* Tema + idioma: esquina superior derecha */}
        <div
          style={{
            position: "absolute",
            top: "1.25rem",
            right: "1.25rem",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("sidebar.themeLight") : t("sidebar.themeDark")}
            title={theme === "dark" ? t("sidebar.themeLight") : t("sidebar.themeDark")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 999,
              background: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <LanguageSelector variant="compact" />
        </div>
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
                  {t("login.title")}
                </h2>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "0.875rem",
                    marginBottom: "2rem",
                  }}
                >
                  {t("login.subtitle")}
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
                    <label style={labelStyle}>{t("login.rut")}</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder={t("login.rutPlaceholder")}
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
                        {t("login.password")}
                      </label>
                      {/* Ojo: este botón está en el panel DERECHO, un .card blanco en
                          tema claro (línea 329), no en el hero oscuro. A 0.7rem el acento
                          puro daba 2.80:1 — el texto más chico de la pantalla era el peor
                          contrastado. Con el token -text queda en 5.18:1. */}
                      <button
                        type="button"
                        onClick={() => setShowReset(true)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-accent-text)",
                          fontSize: "0.7rem",
                          fontWeight: 500,
                          padding: 0,
                        }}
                      >
                        {t("login.forgotPassword")}
                      </button>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type={showPass ? "text" : "password"}
                        placeholder={t("login.passwordPlaceholder")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ paddingRight: "2.5rem" }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        aria-label={showPass ? t("login.hidePassword") : t("login.showPassword")}
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
                    {loading ? t("login.submitting") : t("login.submit")}
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
                  <ArrowLeft size={14} /> {t("login.backToLogin")}
                </button>

                <h2
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {t("login.resetTitle")}
                </h2>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "0.875rem",
                    marginBottom: "2rem",
                  }}
                >
                  {t("login.resetSubtitle")}
                </p>

                {resetMsg && (
                  <div
                    style={{
                      background: resetIsSuccess
                        ? "rgba(34,197,94,0.1)"
                        : "rgba(239,68,68,0.1)",
                      border: `1px solid ${
                        resetIsSuccess
                          ? "rgba(34,197,94,0.3)"
                          : "rgba(239,68,68,0.3)"
                      }`,
                      borderRadius: "0.5rem",
                      padding: "0.75rem",
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                      color: resetIsSuccess ? "#4ade80" : "#f87171",
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
                    <label style={labelStyle}>{t("login.resetEmail")}</label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder={t("login.resetEmailPlaceholder")}
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
                    {loading ? t("login.resetSubmitting") : t("login.resetSubmit")}
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
            {t("login.footerNote")}
          </p>
        </div>

        {/* Número de versión: anclado al fondo del panel */}
        <p
          style={{
            position: "absolute",
            bottom: "1rem",
            left: 0,
            right: 0,
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontSize: "0.8rem",
            opacity: 0.8,
            pointerEvents: "none",
          }}
        >
          v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"}
        </p>
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
