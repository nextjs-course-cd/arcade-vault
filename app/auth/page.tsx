"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp, signInWithOAuth } = useAuth();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUp, setSignedUp] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } =
      tab === "in" ? await signIn(email, pass) : await signUp(email, pass, displayName);

    setLoading(false);

    if (error) {
      setError(error);
      return;
    }

    if (tab === "in") {
      router.push("/juegos");
    } else {
      setSignedUp(true);
    }
  };

  const oauth = async (provider: "google" | "github") => {
    setError(null);
    const { error } = await signInWithOAuth(provider);
    if (error) setError(error);
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            onClick={() => {
              setTab("in");
              setError(null);
              setSignedUp(false);
            }}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            onClick={() => {
              setTab("up");
              setError(null);
              setSignedUp(false);
            }}
          >
            CREAR CUENTA
          </button>
        </div>

        {signedUp ? (
          <div
            className="mono"
            style={{ fontSize: 12, color: "var(--green)", textAlign: "center", padding: "20px 0" }}
          >
            CUENTA CREADA. REVISA TU CORREO PARA CONFIRMARLA ANTES DE INICIAR SESIÓN.
          </div>
        ) : (
          <>
            <form onSubmit={submit}>
              <div className="field">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jugador@vault.gg"
                  required
                />
              </div>
              {tab === "up" && (
                <div className="field slide-in">
                  <label>Nombre de jugador</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="px_kai"
                    maxLength={10}
                    required
                  />
                </div>
              )}
              <div className="field">
                <label>Contraseña</label>
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {tab === "in" && (
                <div style={{ textAlign: "right", marginTop: -6, marginBottom: 4 }}>
                  <Link
                    href="/auth/recuperar"
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-faint)" }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              )}

              {error && (
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--magenta)", marginTop: 4 }}
                >
                  {error}
                </div>
              )}

              <button
                className="btn lg"
                type="submit"
                disabled={loading}
                style={{ width: "100%", marginTop: 8 }}
              >
                {loading ? "PROCESANDO..." : tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
              </button>
            </form>

            <div className="auth-divider">O CONTINÚA CON</div>
            <div className="social">
              <button className="btn ghost" type="button" onClick={() => oauth("google")}>
                ◆ GOOGLE
              </button>
              <button className="btn ghost" type="button" onClick={() => oauth("github")}>
                ▣ GITHUB
              </button>
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
