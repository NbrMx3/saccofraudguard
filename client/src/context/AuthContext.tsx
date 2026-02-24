import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import api from "@/lib/api";

export interface User {
  id: string;
  nationalId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "OFFICER" | "AUDITOR";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (nationalId: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<string>;
  logout: () => Promise<void>;
  forgotPassword: (nationalId: string, email: string) => Promise<string>;
  resetPassword: (
    token: string,
    password: string,
    confirmPassword: string
  ) => Promise<string>;
}

interface SignupData {
  nationalId: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  const checkSession = useCallback(async () => {
    const token = localStorage.getItem("sfg-token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("sfg-token");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (nationalId: string, password: string) => {
    const { data } = await api.post("/api/auth/login", {
      nationalId,
      password,
    });
    // Store token in localStorage for cross-domain support
    if (data.token) {
      localStorage.setItem("sfg-token", data.token);
    }
    setUser(data.user);
  };

  const signup = async (signupData: SignupData): Promise<string> => {
    const { data } = await api.post("/api/auth/signup", signupData);
    return data.message;
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem("sfg-token");
    setUser(null);
  };

  const forgotPassword = async (
    nationalId: string,
    email: string
  ): Promise<string> => {
    const { data } = await api.post("/api/auth/forgot-password", {
      nationalId,
      email,
    });
    return data.message;
  };

  const resetPassword = async (
    token: string,
    password: string,
    confirmPassword: string
  ): Promise<string> => {
    const { data } = await api.post("/api/auth/reset-password", {
      token,
      password,
      confirmPassword,
    });
    return data.message;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
