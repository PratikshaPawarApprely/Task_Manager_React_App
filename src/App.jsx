
import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import LoginPage from "./components/pages/LoginPage";
import Dashboard from "./components/pages/Dashboard";
import AppLayout from "./components/layout/AppLayout";
import CreateTaskPage from "./components/pages/CreateTaskPage";
import Projects from "./components/pages/Projects";
import Categories from "./components/pages/Categories";
import FormikPractice from "./components/pages/FormikPractice";
import AdminUsers from "./components/pages/AdminUsers";

import AssignmentStatic from "./components/pages/AssignmentStatic";
import AssignmentShowMyName from "./components/pages/AssignmentShowMyName";

import api from "./api";
import "./App.css";

// Allow only Admin and Contributor to access Create Task
function AdminContributorRoute({ children }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    let active = true;

    async function checkRole() {
      try {
        const response = await api.get("/accounts/profile/");
        const role = response.data?.role?.toLowerCase();

        if (active) {
          setAllowed(["admin", "contributor"].includes(role));
        }
      } catch (error) {
        console.error("Unable to check user role:", error);

        if (active) {
          setAllowed(false);
        }
      }
    }

    checkRole();

    return () => {
      active = false;
    };
  }, []);

  if (allowed === null) {
    return <p>Checking permissions...</p>;
  }

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppContent() {
  const [authenticated, setAuthenticated] = useState(
    Boolean(localStorage.getItem("access_token"))
  );

  const navigate = useNavigate();

  function handleLogin() {
    setAuthenticated(true);
    navigate("/dashboard", { replace: true });
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");

    setAuthenticated(false);
    navigate("/login", { replace: true });
  }

  if (!authenticated) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<LoginPage onLogin={handleLogin} />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const layout = (page) => (
    <AppLayout
      onLogout={handleLogout}
      username={localStorage.getItem("username")}
    >
      {page}
    </AppLayout>
  );

  return (
    <Routes>
      <Route
        path="/dashboard"
        element={layout(<Dashboard />)}
      />

      <Route
        path="/tasks"
        element={layout(<Dashboard />)}
      />

      {/* Create Task - Admin and Contributor only */}
      <Route
        path="/tasks/new"
        element={
          <AdminContributorRoute>
            {layout(<CreateTaskPage />)}
          </AdminContributorRoute>
        }
      />

      {/* Assignment III - Routing */}
      <Route
        path="/assignment-static"
        element={layout(<AssignmentStatic />)}
      />

      <Route
        path="/assignment-show-my-name"
        element={layout(<AssignmentShowMyName />)}
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/projects" element={<AppLayout onLogout={handleLogout}><Projects /></AppLayout>}/>
      <Route path="/categories" element={ <AppLayout onLogout={handleLogout}> <Categories /> </AppLayout>}/>
      <Route path="/formik-practice" element={<FormikPractice />} />
      <Route path="/admin/users" element={<AdminUsers />} />
    </Routes>

  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
