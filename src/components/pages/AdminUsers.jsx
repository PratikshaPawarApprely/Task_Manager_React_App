import { useEffect, useState } from "react";
import api from "../../api";
import "./AdminUsers.css";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch all users from Django
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("accounts/users/");

      // Supports both paginated and non-paginated responses
      const userData = response.data.results || response.data;
      setUsers(userData);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Unable to load users. Please check your API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Change user role
  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`accounts/users/${userId}/`, {
        role: newRole,
      });

      setUsers((previousUsers) =>
        previousUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (err) {
      console.error("Role update failed:", err);
      alert("Unable to update user role.");
      fetchUsers();
    }
  };

  // Activate or deactivate user
  const handleStatusChange = async (user) => {
    const newStatus = !user.is_active;

    try {
      await api.patch(`accounts/users/${user.id}/`, {
        is_active: newStatus,
      });

      setUsers((previousUsers) =>
        previousUsers.map((item) =>
          item.id === user.id
            ? { ...item, is_active: newStatus }
            : item
        )
      );
    } catch (err) {
      console.error("Status update failed:", err);
      alert("Unable to update user status.");
      fetchUsers();
    }
  };

  // Search users
  const filteredUsers = users.filter((user) => {
    const searchText = search.toLowerCase();

    return (
      (user.username || "").toLowerCase().includes(searchText) ||
      (user.email || "").toLowerCase().includes(searchText) ||
      (user.first_name || "").toLowerCase().includes(searchText) ||
      (user.last_name || "").toLowerCase().includes(searchText)
    );
  });

  if (loading) {
    return <div className="admin-users-page">Loading users...</div>;
  }

  return (
    <div className="admin-users-page">
      <div className="admin-users-header">
        <div>
          <h1>User Management</h1>
          <p>Manage users, roles and account status.</p>
        </div>

        <button onClick={fetchUsers} className="refresh-users-button">
          Refresh
        </button>
      </div>

      <div className="admin-users-summary">
        <div className="admin-summary-card">
          <h3>Total Users</h3>
          <p>{users.length}</p>
        </div>

        <div className="admin-summary-card">
          <h3>Active Users</h3>
          <p>{users.filter((user) => user.is_active).length}</p>
        </div>

        <div className="admin-summary-card">
          <h3>Inactive Users</h3>
          <p>{users.filter((user) => !user.is_active).length}</p>
        </div>
      </div>

      <div className="admin-users-panel">
        <div className="admin-users-toolbar">
          <h2>All Users</h2>

          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <p className="admin-users-error">{error}</p>}

        <div className="admin-users-table-wrapper">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>

                    <td>
                      {user.first_name || user.last_name
                        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                        : user.username}
                    </td>

                    <td>{user.email}</td>

                    <td>
                      <select
                        value={user.role || "Viewer"}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value)
                        }
                      >
                        <option value="Viewer">Viewer</option>
                        <option value="Contributor">Contributor</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>

                    <td>
                      <span
                        className={
                          user.is_active
                            ? "admin-status active"
                            : "admin-status inactive"
                        }
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <button
                        className={
                          user.is_active
                            ? "deactivate-user-button"
                            : "activate-user-button"
                        }
                        onClick={() => handleStatusChange(user)}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="admin-users-empty">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;