import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api";
import "./AppLayout.css";

export default function AppLayout({ children, onLogout, username }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchProfile() {
      try {
        const response = await api.get("/accounts/profile/");

        if (active) {
          setProfile(response.data);
        }
      } catch (error) {
        console.error("Unable to load user profile:", error);
      }
    }

    fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  const role = profile?.role || "User";
  const normalizedRole = role.toLowerCase();

  const canCreateTask = ["admin", "contributor"].includes(
    normalizedRole
  );

  const isAdmin = normalizedRole === "admin";

  const displayName =
    [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ") ||
    profile?.username ||
    username ||
    localStorage.getItem("username") ||
    "User";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  function handleLogout() {
    setSidebarOpen(false);
    onLogout();
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <button
          className="layout-overlay"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`app-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon">T</div>

          <div>
            <h2>TaskFlow</h2>
            <span>Task Manager</span>
          </div>
        </div>

        <p className="sidebar-section-label">WORKSPACE</p>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* All Tasks */}
          <NavLink
            to="/tasks"
            end
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={closeSidebar}
          >
            <span className="nav-icon">☷</span>
            All Tasks
          </NavLink>

          {/* Projects */}
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={closeSidebar}
          >
            <span className="nav-icon">▣</span>
            Projects
          </NavLink>

          {/* Categories */}
          <NavLink
            to="/categories"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={closeSidebar}
          >
            <span className="nav-icon">▤</span>
            Categories
          </NavLink>

          {/* Create New Task - Admin and Contributor */}
          {canCreateTask && (
            <NavLink
              to="/tasks/new"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              onClick={closeSidebar}
            >
              <span className="nav-icon">＋</span>
              Create New Task
            </NavLink>
          )}

          {/* User Management - Admin Only */}
          {isAdmin && (
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              onClick={closeSidebar}
            >
              <span className="nav-icon">♙</span>
              User Management
            </NavLink>
          )}
        </nav>

        {/* User Details and Logout */}
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">
              {initials || "U"}
            </div>

            <div className="user-details">
              <strong title={displayName}>
                {displayName}
              </strong>

              <span className="user-role">{role}</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <span className="nav-icon">↪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="app-main">
        <header className="app-header">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() =>
              setSidebarOpen((open) => !open)
            }
            aria-label="Toggle navigation"
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>

          <div className="header-title">
            <span>Workspace</span>
            <strong>Task Management</strong>
          </div>

          <div className="header-right">
            <span className="status-dot" />
            <span>Workspace active</span>
          </div>
        </header>

        <main className="app-content">
          {children}
        </main>

        <footer className="app-footer">
          <span>
            © {new Date().getFullYear()} TaskFlow
          </span>

          <span>Organize work. Achieve more.</span>
        </footer>
      </div>
    </div>
  );
}