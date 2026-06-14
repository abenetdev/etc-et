import { Navigate, useLocation } from "react-router-dom";

function getHomeRoute(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "vendor") return "/vendor/dashboard";
  return "/shop/home";
}

function CheckAuth({ isAuthenticated, user, children }) {
  const location = useLocation();
  const homeRoute = getHomeRoute(user?.role);

  if (location.pathname === "/") {
    if (!isAuthenticated) {
      return <Navigate to="/auth/login" />;
    }
    return <Navigate to={homeRoute} />;
  }

  if (
    !isAuthenticated &&
    !(
      location.pathname.includes("/login") ||
      location.pathname.includes("/register")
    )
  ) {
    return <Navigate to="/auth/login" />;
  }

  if (
    isAuthenticated &&
    (location.pathname.includes("/login") ||
      location.pathname.includes("/register"))
  ) {
    return <Navigate to={homeRoute} />;
  }

  if (isAuthenticated && location.pathname.startsWith("/admin")) {
    if (user?.role !== "admin") {
      return <Navigate to="/unauth-page" />;
    }
  }

  if (isAuthenticated && location.pathname.startsWith("/vendor")) {
    if (user?.role !== "vendor") {
      return <Navigate to="/unauth-page" />;
    }
  }

  if (
    isAuthenticated &&
    user?.role === "vendor" &&
    location.pathname.includes("shop")
  ) {
    return <Navigate to="/vendor/dashboard" />;
  }

  if (
    isAuthenticated &&
    user?.role === "admin" &&
    location.pathname.includes("shop")
  ) {
    return <Navigate to="/admin/dashboard" />;
  }

  return <>{children}</>;
}

export default CheckAuth;
