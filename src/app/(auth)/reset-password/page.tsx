"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPasswordAction } from "@/actions/auth";
import { Wind, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  marginBottom: "0.5rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};

// Espejo de la política del backend (ResetPasswordRequest): 12–72 con letra y número.
function cumplePolitica(password: string): boolean {
  return (
    password.length >= 12 &&
    password.length <= 72 &&
    /[a-zA-Z]/.test(password) &&
    /\d/.test(password)
  );
}

function ResetPasswordForm() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!cumplePolitica(password)) {
      setError(t("resetPassword.errorPolicy"));
      return;
    }
    if (password !== confirm) {
      setError(t("resetPassword.errorMismatch"));
      return;
    }
    setLoading(true);
    const result = await resetPasswordAction(token, password);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setDone(true);
    }
  }

  return (
    <div
      className="card"
      style={{ boxShadow: "0 24px 48px rgba(0,0,0,0.4)", padding: "2.5rem" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "0.75rem",
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            flexShrink: 0,
          }}
        >
          {/* Sobre el cuadro naranja de la línea 84 el blanco medía 2.80:1 en el
              extremo #f97316 y 3.56:1 en el #ea580c, o sea bajo el 3:1 de AA para
              gráficos justo donde el gradiente es más claro; --color-on-accent da
              5.91:1 / 4.65:1. Por `style` y no por el prop `color=`: lucide manda
              ese prop al atributo stroke="", donde var() no resuelve en todos los
              motores, y sin él el trazo queda en currentColor. */}
          <Wind size={24} style={{ color: "var(--color-on-accent)" }} />
        </div>
        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
          {t("branding.appName")}
        </span>
      </div>

      {done ? (
        <>
          <div
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "0.5rem",
              padding: "0.75rem",
              color: "#4ade80",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            {t("resetPassword.success")}
          </div>
          <Link
            href="/login"
            className="btn-primary"
            style={{
              display: "block",
              textAlign: "center",
              width: "100%",
              padding: "0.875rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            {t("resetPassword.goToLogin")}
          </Link>
        </>
      ) : (
        <>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              marginBottom: "0.5rem",
            }}
          >
            {t("resetPassword.title")}
          </h2>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
              marginBottom: "2rem",
            }}
          >
            {t("resetPassword.subtitle")}
          </p>

          {!token && (
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
              {t("resetPassword.errorNoToken")}
            </div>
          )}

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
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <div>
              <label style={labelStyle}>{t("resetPassword.newPassword")}</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input-field"
                  type={showPass ? "text" : "password"}
                  placeholder={t("resetPassword.placeholder")}
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

            <div>
              <label style={labelStyle}>{t("resetPassword.confirmPassword")}</label>
              <input
                className="input-field"
                type={showPass ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            <button
              className="btn-primary"
              type="submit"
              disabled={loading || !token}
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
              {loading ? t("resetPassword.submitting") : t("resetPassword.submit")}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
            {/* Este enlace vive dentro del .card (línea 65), blanco en tema claro: el
                acento puro daba 2.80:1 y sin subrayado quedaba casi ilegible. El token
                -text (orange-700) sube a 5.18:1 sin cambiar el naranja percibido. */}
            <Link
              href="/login"
              style={{ color: "var(--color-accent-text)", fontSize: "0.8rem", textDecoration: "none" }}
            >
              {t("login.backToLogin")}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--color-bg-primary)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* useSearchParams exige Suspense en el prerender del App Router */}
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
