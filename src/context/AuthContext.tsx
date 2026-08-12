import React, { createContext, useContext, useState, useEffect } from "react";
import { apiUrl, clearStoredAuthToken } from "@/lib/api";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  organization?: string;
  tenant_id?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  role: "admin" | "manager" | "developer" | "operator" | "viewer" | string;
  created_on?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: {
    first_name: string;
    last_name: string;
    organization: string;
    email: string;
    password: string;
    confirm_password: string;
  }) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("nx_token"));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch(apiUrl("/api/auth/me"), {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const profile = await res.json();
        setUser(profile);
      } else {
        // Invalid token
        clearStoredAuthToken();
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error("[AuthContext] Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, pass: string) => {
    try {
      const cleanEmail = email.trim();
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: pass }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { detail: "Server error during login. Check server connection." };
      }

      if (!res.ok) {
        let errStr = "Login failed";
        if (typeof data.detail === "string") errStr = data.detail;
        else if (typeof data.error === "string") errStr = data.error;
        else if (data.detail && typeof data.detail === "object") {
          const fieldErrs = Object.values(data.detail.fieldErrors || {}).flat();
          errStr = fieldErrs.length > 0 ? fieldErrs.join(", ") : JSON.stringify(data.detail);
        }
        return { success: false, error: errStr };
      }

      const authToken = data.access_token;
      const userProfile = data.user;

      localStorage.setItem("nx_token", authToken);
      localStorage.setItem("access_token", authToken);
      setToken(authToken);
      setUser(userProfile);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: String(err?.message || "Network error during login") };
    }
  };

  const signup = async (signupData: {
    first_name: string;
    last_name: string;
    organization: string;
    email: string;
    password: string;
    confirm_password: string;
  }) => {
    try {
      const cleanData = {
        ...signupData,
        first_name: signupData.first_name.trim(),
        last_name: signupData.last_name.trim(),
        organization: signupData.organization.trim(),
        email: signupData.email.trim(),
      };
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanData),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { detail: "Server response was invalid. Please verify server connection." };
      }

      if (!res.ok) {
        let errStr = "Signup failed";
        if (typeof data.detail === "string") errStr = data.detail;
        else if (typeof data.error === "string") errStr = data.error;
        else if (data.detail && typeof data.detail === "object") {
          const fieldErrs = Object.values(data.detail.fieldErrors || {}).flat();
          errStr = fieldErrs.length > 0 ? fieldErrs.join(", ") : JSON.stringify(data.detail);
        }
        return { success: false, error: errStr };
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: String(err?.message || "Network error during signup") };
    }
  };

  const logout = () => {
    clearStoredAuthToken();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) await fetchCurrentUser(token);
  };

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "admin" || user?.role === "manager";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        isAdmin,
        isManager,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
