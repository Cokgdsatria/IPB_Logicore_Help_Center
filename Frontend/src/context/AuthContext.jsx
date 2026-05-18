import { createContext, useContext, useState, useEffect } from 'react';
import { dummyUser } from '../data/dummy';

const AuthContext = createContext(null);

const normalizeApiUrl = (rawUrl) => {
  if (!rawUrl) return null;
  const trimmed = String(rawUrl).replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email, password) => {
    try{
      const apiUrl = normalizeApiUrl(import.meta.env.VITE_API_URL) || 'http://127.0.0.1:8000/api/v1';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {'Content-Type' : 'application/json'},
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) throw new Error('Login Gagal');

      const data = await response.json();

      // Simpan access token agar request endpoint protected tidak 401
      localStorage.setItem('token', data.access_token);

      const userData = { nama: data.nama, role: data.role, email };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, role: data.role };
    } catch (error) {

      console.error(error);
      return { success: false, message: error.message };

    // if (email === 'mahasiswa@example.com' && password === dummyUser.mahasiswa.password) {
    //   setUser(dummyUser.mahasiswa);
    //   return { success: true, role: 'mahasiswa' };
    // }
    // if (email === 'dosen@example.com' && password === dummyUser.dosen.password) {
    //   setUser(dummyUser.dosen);
    //   return { success: true, role: 'dosen' };
    // }
    // return { success: false };
  }
};

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
