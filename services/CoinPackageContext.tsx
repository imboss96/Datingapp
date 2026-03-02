import { useState, useEffect, useContext, createContext } from 'react';
import apiClient from './apiClient';

interface CoinPackage {
  id?: string;
  coins: number;
  price: number;
  icon?: string;
  popular?: boolean;
}

interface CoinPackageContextType {
  coinPackages: CoinPackage[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Create context for coin packages
const CoinPackageContext = createContext<CoinPackageContextType | undefined>(undefined);

// Default packages fallback
const DEFAULT_PACKAGES: CoinPackage[] = [
  { id: 'coins_50', coins: 50, price: 4.99, icon: 'fa-box' },
  { id: 'coins_150', coins: 150, price: 12.99, icon: 'fa-boxes-stacked', popular: true },
  { id: 'coins_350', coins: 350, price: 24.99, icon: 'fa-vault' },
  { id: 'coins_1000', coins: 1000, price: 59.99, icon: 'fa-gem' }
];

// Provider component that should wrap the app
export const CoinPackageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>(DEFAULT_PACKAGES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCoinPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[DEBUG CoinPackageContext] Fetching coin packages...');
      
      const response = await apiClient.getPublicCoinPackages();
      console.log('[DEBUG CoinPackageContext] Response:', response);

      if (response.success && response.packages && Array.isArray(response.packages)) {
        const formattedPackages: CoinPackage[] = response.packages.map((pkg: any) => ({
          id: `coins_${pkg.coins}`,
          coins: pkg.coins,
          price: Number(pkg.price),
          icon: 'fa-coins',
          popular: pkg.displayOrder === 2
        }));
        
        console.log('[DEBUG CoinPackageContext] Formatted packages:', formattedPackages);
        setCoinPackages(formattedPackages);
      } else {
        console.warn('[WARNING CoinPackageContext] Invalid response structure:', response);
        setError('Invalid package data received');
      }
    } catch (err) {
      const errorMsg = (err as any).message || 'Failed to fetch coin packages';
      console.error('[ERROR CoinPackageContext] Failed to fetch:', errorMsg, err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and set up interval
  useEffect(() => {
    console.log('[DEBUG CoinPackageContext] Provider mounted, initial fetch...');
    fetchCoinPackages();

    // Refetch every 10 seconds for real-time updates
    const interval = setInterval(() => {
      console.log('[DEBUG CoinPackageContext] 10-second refresh interval triggered');
      fetchCoinPackages();
    }, 10000);

    return () => {
      console.log('[DEBUG CoinPackageContext] Provider unmounting, clearing interval');
      clearInterval(interval);
    };
  }, []);

  const value: CoinPackageContextType = {
    coinPackages,
    loading,
    error,
    refetch: fetchCoinPackages
  };

  return (
    <CoinPackageContext.Provider value={value}>
      {children}
    </CoinPackageContext.Provider>
  );
};

// Custom hook to use coin packages anywhere in the app
export const useCoinPackages = (): CoinPackageContextType => {
  const context = useContext(CoinPackageContext);
  if (!context) {
    throw new Error('useCoinPackages must be used within CoinPackageProvider');
  }
  return context;
};
