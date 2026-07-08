import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(null);
  const [employeeToken, setEmployeeToken] = useState(null);
  const [adminToken, setAdminToken] = useState(null);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('employeeOutlookEmail');
    const savedEmpToken = sessionStorage.getItem('employeeToken');
    const savedAdminToken = sessionStorage.getItem('adminToken');

    if (savedEmail && savedEmpToken) {
      setEmployee(savedEmail);
      setEmployeeToken(savedEmpToken);
    }
    if (savedAdminToken) {
      setAdminToken(savedAdminToken);
    }
  }, []);

  const loginEmployee = (email, token) => {
    sessionStorage.setItem('employeeOutlookEmail', email);
    sessionStorage.setItem('employeeToken', token);
    setEmployee(email);
    setEmployeeToken(token);
  };

  const logoutEmployee = () => {
    sessionStorage.removeItem('employeeOutlookEmail');
    sessionStorage.removeItem('employeeToken');
    setEmployee(null);
    setEmployeeToken(null);
  };

  const loginAdmin = (token) => {
    sessionStorage.setItem('adminToken', token);
    setAdminToken(token);
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem('adminToken');
    setAdminToken(null);
  };

  return (
    <AuthContext.Provider value={{
      employee,
      employeeToken,
      adminToken,
      loginEmployee,
      logoutEmployee,
      loginAdmin,
      logoutAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
