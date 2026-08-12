import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const ProtectedRoute = ({ children, requiredRole, requiredRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  const roles = Array.isArray(requiredRoles) && requiredRoles.length > 0
    ? requiredRoles
    : (requiredRole ? [requiredRole] : []);
  const userRoles = new Set([user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])].filter(Boolean));
  if (roles.length > 0 && !roles.some((role) => userRoles.has(role))) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
