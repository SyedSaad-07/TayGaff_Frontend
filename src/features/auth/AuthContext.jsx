import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth/api";
import { setUnauthorizedHandler, tokenStore } from "@/shared/api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const loggingOutRef = useRef(false);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  useEffect(() => {
    const boot = async () => {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const profile = await authApi.me();
        setUser(profile);
      } catch {
        tokenStore.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    void boot();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      tokenStore.clear();
      setUser(null);
      navigate("/login", { replace: true });
      // Allow future unauthorized events after redirect settles
      window.setTimeout(() => {
        loggingOutRef.current = false;
      }, 500);
    });

    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email, password);
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
