import { createContext, useContext, useState } from 'react';

export const USERS = ['Aymane', 'Zaid'];

const UserCtx = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => localStorage.getItem('rwa-user') || 'Aymane');

  const switchUser = (u) => {
    setUser(u);
    localStorage.setItem('rwa-user', u);
  };

  return (
    <UserCtx.Provider value={{ user, users: USERS, switchUser }}>
      {children}
    </UserCtx.Provider>
  );
}

export const useUser = () => useContext(UserCtx);
