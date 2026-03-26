import React, { createContext, useContext, useEffect } from "react";
import { useGetMe, User, useLogout } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useGetMe({
    // @ts-expect-error queryKey is provided internally by the generate hook
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    }
  });

  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/login");
      }
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user: user ?? null, 
        isLoading, 
        logout: handleLogout,
        isAuthenticated: !!user && !error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
