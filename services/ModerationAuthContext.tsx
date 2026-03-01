import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  accountType: 'APP' | 'STANDALONE';
  coins?: number;
}

interface ModerationAuthContextType {
  user: User | null;
  token: string | null;
  accountType: 'APP' | 'STANDALONE' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Auth methods
  login: (username: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, passwordConfirmation: string, name: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const ModerationAuthContext = createContext<ModerationAuthContextType | undefined>(undefined);

export const ModerationAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'APP' | 'STANDALONE' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('moderationToken');
        const storedUser = localStorage.getItem('moderationUser');
        const storedAccountType = localStorage.getItem('moderationAccountType') as 'APP' | 'STANDALONE' | null;

        if (storedToken && storedUser) {
          // Verify token is still valid
          const response = await fetch('/api/moderation-auth/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: storedToken })
          });

          if (response.ok) {
            const data = await response.json();
            setToken(storedToken);
            setUser(data.user);
            setAccountType(data.accountType);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('moderationToken');
            localStorage.removeItem('moderationUser');
            localStorage.removeItem('moderationAccountType');
          }
        }
      } catch (err) {
        console.error('[ERROR] Auth initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/moderation-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();

      // Store in state and localStorage
      setToken(data.token);
      setUser(data.user);
      setAccountType(data.accountType);

      localStorage.setItem('moderationToken', data.token);
      localStorage.setItem('moderationUser', JSON.stringify(data.user));
      localStorage.setItem('moderationAccountType', data.accountType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    username: string,
    password: string,
    passwordConfirmation: string,
    name: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/moderation-auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username,
          password,
          passwordConfirmation,
          name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();

      // Store in state and localStorage
      setToken(data.token);
      setUser(data.user);
      setAccountType(data.accountType);

      localStorage.setItem('moderationToken', data.token);
      localStorage.setItem('moderationUser', JSON.stringify(data.user));
      localStorage.setItem('moderationAccountType', data.accountType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAccountType(null);
    setError(null);

    localStorage.removeItem('moderationToken');
    localStorage.removeItem('moderationUser');
    localStorage.removeItem('moderationAccountType');
  };

  const clearError = () => {
    setError(null);
  };

  const value: ModerationAuthContextType = {
    user,
    token,
    accountType,
    isLoading,
    isAuthenticated: !!user && !!token,
    error,
    login,
    register,
    logout,
    clearError
  };

  return (
    <ModerationAuthContext.Provider value={value}>
      {children}
    </ModerationAuthContext.Provider>
  );
};

export const useModerationAuth = () => {
  const context = useContext(ModerationAuthContext);
  if (!context) {
    throw new Error('useModerationAuth must be used within ModerationAuthProvider');
  }
  return context;
};
