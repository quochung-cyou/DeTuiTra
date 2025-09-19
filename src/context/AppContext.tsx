import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { Fund, Transaction, User } from "@/types";
import { toast } from "sonner";
import { 
  loginWithGoogle, 
  logoutUser, 
  onAuthStateChange 
} from "@/firebase/auth";
import { User as FirebaseUser } from "firebase/auth";
import {
  createFund as createFirebaseFund,
  getUserFunds,
  getFundById,
  updateFund as updateFirebaseFund,
  deleteFund as deleteFundService
} from "@/firebase/fundService";
import {
  createTransaction as createFirebaseTransaction,
  getFundTransactions,
  deleteTransaction
} from "@/firebase/transactionService";
import {
  findUserByEmail as findUserByEmailFirestore,
  getUsersByIds as getFirestoreUsersByIds,
  syncUserWithFirestore,
  addUserToFundByEmail
} from "@/firebase/userService";
import { calculateTransactionSplits } from "@/utils/transactionUtils";

interface AppContextType {
  currentUser: User | null;
  funds: Fund[];
  transactions: Transaction[];
  selectedFund: Fund | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setSelectedFund: (fund: Fund | null) => void;
  createFund: (fund: Omit<Fund, "id" | "createdAt" | "createdBy">) => Promise<Fund | undefined>;
  updateFund: (fundId: string, fundData: Partial<Omit<Fund, "id" | "createdAt" | "createdBy">>) => Promise<boolean>;
  createTransaction: (transaction: Omit<Transaction, "id" | "createdAt">) => Promise<Transaction | undefined>;
  deleteTransaction: (transactionId: string) => Promise<boolean>;
  getUserById: (id: string) => User;
  loadUsers: (userIds: string[]) => Promise<void>;
  users: Record<string, User>;
  findUserByEmail: (email: string) => Promise<User | null>;
  addMemberByEmail: (fundId: string, email: string) => Promise<boolean>;
  calculateBalances: (fundId: string) => { userId: string; amount: number }[];
  refreshCurrentUser: () => Promise<void>;
  isAuthLoading: boolean;
  authInitialized: boolean;
  isLoading: boolean;
  hasInitiallyLoaded: boolean;
  loadUserFunds: (userId: string) => Promise<void>;
  loadFundTransactions: (fundId: string) => Promise<void>;
  deleteFund: (fundId: string) => Promise<boolean>;
  getFundById: (fundId: string) => Promise<Fund | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true); // Start as true
  const [authInitialized, setAuthInitialized] = useState<boolean>(false); // Track if auth has been checked
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState<boolean>(false);

  // Convert Firebase user to our User type
  const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
    return {
      id: firebaseUser.uid,
      displayName: firebaseUser.displayName || "User",
      email: firebaseUser.email || "",
      photoURL: firebaseUser.photoURL || "",
    };
  };

  // Real Firebase login with Google
  const login = async () => {
    try {
      setIsAuthLoading(true);
      await loginWithGoogle();
      toast.success("Đăng nhập thành công!", {
        duration: 1000,
        
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Đăng nhập thất bại";
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Real Firebase logout
  const logout = async () => {
    try {
      setIsAuthLoading(true);
      await logoutUser();
      setSelectedFund(null);
      toast.info("Đã đăng xuất");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Đăng xuất thất bại";
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Load multiple users by IDs using the centralized batch function
  const loadUsers = useCallback(async (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return;
    
    // Filter out IDs that are already loaded, invalid, or the current user
    const uniqueIds = [...new Set(userIds)].filter(id => 
      id && 
      id !== currentUser?.id && // Current user is already available
      !users[id] // Not already loaded
    );
    
    if (uniqueIds.length === 0) return;
    
    try {
      setIsLoading(true);
      console.log('AppContext: Loading users via batch:', uniqueIds);
      
      // Use the centralized batch function
      const usersMap = await getFirestoreUsersByIds(uniqueIds);
      
      // Update users state
      setUsers(prev => {
        const newUsers = { ...prev };
        usersMap.forEach((user, userId) => {
          newUsers[userId] = user;
        });
        console.log('AppContext: Loaded', usersMap.size, 'users');
        return newUsers;
      });
    } catch (error) {
      console.error('AppContext: Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, users]);

  // Get user by ID - synchronous, uses preloaded data
  const getUserById = (id: string): User => {
    // Handle null/undefined IDs
    if (!id) {
      return {
        id: 'unknown',
        displayName: 'Unknown User',
        email: '',
        photoURL: '',
        bankAccount: undefined
      };
    }
    
    // If the current user matches the ID, return the current user
    // This ensures the most up-to-date data including bankAccount
    if (currentUser && currentUser.id === id) {
      return currentUser;
    }
    
    // Return from loaded users or placeholder
    if (users[id]) {
      return users[id];
    }
    
    // Return placeholder for unloaded users
    const idStr = String(id);
    const shortId = idStr.substring(0, 4);
    return {
      id,
      displayName: `User ${shortId}`,
      email: '',
      photoURL: '',
      bankAccount: undefined
    };
  };
  
  // Refresh current user data from Firestore (uses batch getUsersByIds)
  const refreshCurrentUser = async () => {
    if (!currentUser?.id) return;
    
    try {
      // Use the batch function for consistency
      const refreshedUsers = await getFirestoreUsersByIds([currentUser.id]);
      const updatedUser = refreshedUsers.get(currentUser.id);
      
      if (updatedUser) {
        setCurrentUser(updatedUser);
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        console.log('Current user refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing current user:', error);
    }
  };

  // Find a user by email using Firebase
  const findUserByEmail = async (email: string) => {
    if (!email) return null;
    
    try {
      setIsLoading(true);
      // Using the imported function from userService
      return await findUserByEmailFirestore(email);
    } catch (error) {
      console.error('Error finding user by email:', error);
      toast.error('Không thể tìm kiếm người dùng');
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a user to a fund by email
  const addMemberByEmail = async (fundId: string, email: string): Promise<boolean> => {
    if (!fundId || !email) return false;
    
    try {
      setIsLoading(true);
      const result = await addUserToFundByEmail(fundId, email);
      
      if (result) {
        // Reload fund data to get updated member list
        if (currentUser) {
          await loadUserFunds(currentUser.id);
        }
        toast.success('Thành viên đã được thêm vào quỹ');
      } else {
        toast.error('Không tìm thấy người dùng với email này');
      }
      
      return result;
    } catch (error) {
      console.error('Error adding member by email:', error);
      toast.error('Không thể thêm thành viên');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Load user's funds from Firebase
  const loadUserFunds = useCallback(async (userId: string) => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const userFunds = await getUserFunds(userId);
      
      // Prevent duplicates by using a Map with fund IDs as keys
      const uniqueFundsMap = new Map();
      
      // First add existing funds to the map (if we want to keep them)
      funds.forEach(fund => uniqueFundsMap.set(fund.id, fund));
      
      // Then add/update with the newly fetched funds
      userFunds.forEach(fund => uniqueFundsMap.set(fund.id, fund));
      
      // Convert map back to array
      const uniqueFunds = Array.from(uniqueFundsMap.values());
      
      // Update state with deduplicated funds
      setFunds(uniqueFunds);
      setHasInitiallyLoaded(true); // Mark initial load as complete
      
      console.log(`Loaded ${userFunds.length} funds, deduplicated to ${uniqueFunds.length}`);
    } catch (error) {
      console.error('Error loading funds:', error);
      toast.error('Không thể tải danh sách quỹ');
      setHasInitiallyLoaded(true); // Mark as loaded even on error to prevent infinite loading
    } finally {
      setIsLoading(false);
    }
  }, [funds]);

  // Load transactions for a specific fund
  const loadFundTransactions = async (fundId: string) => {
    if (!fundId) return;
    
    try {
      setIsLoading(true);
      const fundTransactions = await getFundTransactions(fundId);
      
      if (fundTransactions.length === 0) {
        console.log('No transactions found for fund');
        setTransactions([]);
        return;
      }
      
      // Ensure all transactions have a date field and valid properties
      const processedTransactions = fundTransactions.map(transaction => {
        // Ensure we have valid data
        const validTransaction = {
          ...transaction,
          id: transaction.id || 'unknown',
          fundId: transaction.fundId || fundId,
          description: transaction.description || 'Giao dịch',
          amount: typeof transaction.amount === 'number' ? transaction.amount : 0,
          paidBy: transaction.paidBy || '',
          splits: Array.isArray(transaction.splits) ? transaction.splits : [],
          createdAt: transaction.createdAt || Date.now(),
          date: transaction.date || transaction.createdAt || Date.now(),
        };
        return validTransaction;
      });
      
      // Sort by date in descending order
      const sortedTransactions = processedTransactions.sort((a, b) => {
        const dateA = a.date || a.createdAt;
        const dateB = b.date || b.createdAt;
        return dateB - dateA;
      });
      
      setTransactions(sortedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Không thể tải danh sách giao dịch');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new fund using Firebase
  const createFund = async (fund: Omit<Fund, "id" | "createdAt" | "createdBy">) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const newFund = await createFirebaseFund(fund, currentUser.id);
      setFunds((prev) => [...prev, newFund]);
      setSelectedFund(newFund);
      toast.success("Đã tạo quỹ mới thành công!");
      return newFund;
    } catch (error) {
      console.error('Error creating fund:', error);
      const errorMessage = error instanceof Error ? error.message : "Không thể tạo quỹ mới";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a fund
  const deleteFund = async (fundId: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      setIsLoading(true);
      await deleteFundService(fundId);
      
      // Update local state
      setFunds((prev) => prev.filter(f => f.id !== fundId));
      
      // If the deleted fund was selected, clear the selection
      if (selectedFund?.id === fundId) {
        setSelectedFund(null);
      }
      
      toast.success("Quỹ đã được xóa thành công!");
      return true;
    } catch (error) {
      console.error('Error deleting fund:', error);
      const errorMessage = error instanceof Error ? error.message : "Không thể xóa quỹ";
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new transaction using Firebase
  const createTransaction = async (transaction: Omit<Transaction, "id" | "createdAt">) => {
    try {
      setIsLoading(true);
      console.log(transaction);
      // Add date field if not provided
      const transactionWithDate = {
        ...transaction,
        date: transaction.date || Date.now(),
        // Use the utility function to calculate the final splits
        splits: calculateTransactionSplits(transaction)
      };
      const newTransaction = await createFirebaseTransaction(transactionWithDate);
      
      // Update local state
      setTransactions((prev) => {
        // Check if transaction already exists to avoid duplicates
        const exists = prev.some(t => t.id === newTransaction.id);
        if (exists) {
          return prev.map(t => t.id === newTransaction.id ? newTransaction : t);
        } else {
          return [...prev, newTransaction];
        }
      });
      
      toast.success("Đã thêm giao dịch mới thành công!");
      return newTransaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      const errorMessage = error instanceof Error ? error.message : "Không thể tạo giao dịch mới";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing fund
  const updateFund = async (
    fundId: string,
    fundData: Partial<Omit<Fund, "id" | "createdAt" | "createdBy">>
  ): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      setIsLoading(true);
      // Call Firebase service to update the fund
      await updateFirebaseFund(fundId, fundData);
      
      // Update local state
      setFunds((prev) => 
        prev.map((fund) => 
          fund.id === fundId ? { ...fund, ...fundData } : fund
        )
      );
      
      // If this was the selected fund, also update that reference
      if (selectedFund?.id === fundId) {
        setSelectedFund((prevFund) => 
          prevFund ? { ...prevFund, ...fundData } : prevFund
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error updating fund:', error);
      const errorMessage = error instanceof Error ? error.message : "Không thể cập nhật quỹ";
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate balances for a fund
  const calculateBalances = (fundId: string) => {
    const fundTransactions = transactions.filter(
      (transaction) => transaction.fundId === fundId
    );
    
    const balances: Record<string, number> = {};
    
    for (const transaction of fundTransactions) {
      for (const split of transaction.splits) {
        if (!balances[split.userId]) {
          balances[split.userId] = 0;
        }
        balances[split.userId] += split.amount;
      }
    }
    
    return Object.entries(balances).map(([userId, amount]) => ({
      userId,
      amount,
    }));
  };

  // Check for cached auth state on initial load
  useEffect(() => {
    console.log('AppContext: Initializing authentication...');
    let hasRestoredFromCache = false;
    
    // Try to restore from sessionStorage to provide immediate UI feedback
    const cachedUser = sessionStorage.getItem('currentUser');
    if (cachedUser) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        console.log('AppContext: Restored user from cache:', parsedUser.email);
        setCurrentUser(parsedUser);
        setIsAuthLoading(false); // Show UI immediately with cached data
        hasRestoredFromCache = true;
        
        // Load funds for cached user in background
        loadUserFunds(parsedUser.id).catch(error => {
          console.error('Error loading cached user funds:', error);
        });
      } catch (e) {
        console.warn('AppContext: Invalid cached user data, removing cache');
        sessionStorage.removeItem('currentUser');
      }
    }

    // Listen for authentication state changes
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('AppContext: Auth state changed:', firebaseUser ? 'authenticated' : 'not authenticated');
      setAuthInitialized(true); // Mark that Firebase has provided initial state
      
      if (firebaseUser) {
        // Skip processing if we already have this exact user loaded
        if (currentUser && currentUser.id === firebaseUser.uid && hasRestoredFromCache) {
          console.log('AppContext: User already loaded from cache, verifying...');
          // Just verify the user is still valid, don't reload everything
          try {
            await syncUserWithFirestore(firebaseUser);
            console.log('AppContext: Cached user verified successfully');
          } catch (error) {
            console.warn('AppContext: Error verifying cached user:', error);
          }
          setIsAuthLoading(false);
          return;
        }
        
        try {
          console.log('AppContext: Syncing user with Firestore...');
          // Get complete user data from Firestore (including bankAccount)
          const fullUser = await syncUserWithFirestore(firebaseUser);
          setCurrentUser(fullUser);
          // Cache the complete user data
          sessionStorage.setItem('currentUser', JSON.stringify(fullUser));
          console.log('AppContext: User synced and cached successfully');
          
          // Load funds if not already loaded
          if (!hasRestoredFromCache) {
            loadUserFunds(fullUser.id).catch(error => {
              console.error('Error loading user funds:', error);
            });
          }
        } catch (error) {
          console.error('Error syncing user:', error);
          // Fallback to basic Firebase user data
          const basicUser = convertFirebaseUser(firebaseUser);
          setCurrentUser(basicUser);
          sessionStorage.setItem('currentUser', JSON.stringify(basicUser));
        } finally {
          setIsAuthLoading(false);
        }
      } else {
        console.log('AppContext: User signed out, clearing state');
        // User is signed out
        setCurrentUser(null);
        setFunds([]);
        setTransactions([]);
        setUsers({}); // Clear users cache
        setHasInitiallyLoaded(false); // Reset initial load state
        sessionStorage.removeItem('currentUser');
        setIsAuthLoading(false);
      }
    });

    // Set auth loading to false after a maximum timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (!authInitialized) {
        console.warn('AppContext: Auth initialization timeout, proceeding with current state');
        setIsAuthLoading(false);
        setAuthInitialized(true);
      }
    }, 3000); // Increased to 3 seconds for better reliability

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);
  
  // Load transactions when a fund is selected
  useEffect(() => {
    if (selectedFund) {
      loadFundTransactions(selectedFund.id);
    }
  }, [selectedFund]);
  
  // Reload transactions periodically to ensure we have the latest data
  useEffect(() => {
    if (!selectedFund) return;
    
    // Initial load
    loadFundTransactions(selectedFund.id);
    
    // Set up interval to refresh transactions
    const intervalId = setInterval(() => {
      if (selectedFund) {
        loadFundTransactions(selectedFund.id);
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [selectedFund?.id]);

  // Delete a transaction
  const deleteTransactionById = async (transactionId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      // Call Firebase service to delete the transaction
      await deleteTransaction(transactionId);
      
      // Update local state
      setTransactions((prev) => prev.filter((transaction) => transaction.id !== transactionId));
      
      toast.success("Giao dịch đã được xóa thành công!");
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      const errorMessage = error instanceof Error ? error.message : "Không thể xóa giao dịch";
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get a specific fund by ID directly from Firebase
  const fetchFundById = async (fundId: string): Promise<Fund | null> => {
    try {
      setIsLoading(true);
      // Use the imported getFundById from fundService
      const fundData = await getFundById(fundId);
      
      // If we find the fund, add it to our local state if not already there
      if (fundData) {
        // Check if fund exists in our local state
        const existingFund = funds.find(f => f.id === fundId);
        
        if (!existingFund) {
          // Add to our local state if not already there
          setFunds(prev => [...prev, fundData]);
        }
      }
      
      return fundData;
    } catch (error) {
      console.error('Error getting fund by ID:', error);
      toast.error('Không thể tải dữ liệu quỹ');
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AppContext.Provider
      value={{
        currentUser,
        funds,
        transactions,
        selectedFund,
        login,
        logout,
        setSelectedFund,
        createFund,
        updateFund,
        createTransaction,
        deleteTransaction: deleteTransactionById,
        getUserById,
        loadUsers,
        users,
        findUserByEmail,
        addMemberByEmail,
        calculateBalances,
        refreshCurrentUser,
        deleteFund,
        isAuthLoading,
        authInitialized,
        isLoading,
        hasInitiallyLoaded,
        loadUserFunds,
        loadFundTransactions,
        getFundById: fetchFundById
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
