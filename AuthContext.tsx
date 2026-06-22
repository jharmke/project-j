import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebaseConfig';
import { resetRestoreGate } from './services/syncService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    // Re-lock sync and clear the in-memory gate so the next sign-in re-runs it from
    // scratch. The local data-owner stamp (pj_data_owner_uid) is deliberately NOT cleared
    // here: it must survive sign-out so the gate can detect an account switch on the next
    // sign-in and replace local data with the correct account's cloud before unlocking sync.
    resetRestoreGate();
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
