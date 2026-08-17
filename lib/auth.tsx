"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface AuthUser {
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (name: string) => void;
  loginAsGuest: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem("av_user") || "null");
    } catch {
      return null;
    }
  });

  const login = (name: string) => {
    const u: AuthUser = { name: (name || "PLAYER1").toUpperCase().slice(0, 10) };
    localStorage.setItem("av_user", JSON.stringify(u));
    setUser(u);
  };

  const loginAsGuest = () => {
    localStorage.removeItem("av_user");
    setUser(null);
  };

  const signOut = () => {
    localStorage.removeItem("av_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
