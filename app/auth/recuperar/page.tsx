"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/nueva-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">RECUPERAR CONTRASEÑA</h2>
        </div>

        {sent ? (
          <div
            className="mono"
            style={{ fontSize: 12, color: "var(--green)", textAlign: "center", padding: "20px 0" }}
          >
            REVISA TU CORREO PARA CONTINUAR CON EL RESTABLECIMIENTO.
          </div>
        ) : (
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

            {error && (
              <div className="mono" style={{ fontSize: 11, color: "var(--magenta)", marginTop: 4 }}>
                {error}
              </div>
            )}

            <button
              className="btn lg"
              type="submit"
              disabled={loading}
              style={{ width: "100%", marginTop: 8 }}
            >
              {loading ? "ENVIANDO..." : "ENVIAR ENLACE"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 18, textAlign: "center" }}>
          <Link href="/auth" className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            VOLVER A INICIAR SESIÓN
          </Link>
        </div>
      </div>
    </div>
  );
}
