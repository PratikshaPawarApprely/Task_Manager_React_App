
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import "./CreateTaskPage.css";

const USERS_API_URL = "/accounts/users/";
const INITIAL_USER_COUNT = 5;

function CreateTaskPage() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "pending",
    due_date: "",
    assigned_to: "",
  });

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch users from backend
  useEffect(() => {
    let active = true;

    async function fetchUsers() {
      setLoadingUsers(true);

      try {
        const response = await api.get(USERS_API_URL);

        const data = response.data;
        const userList = Array.isArray(data)
          ? data
          : data.results || data.users || [];

        if (active) {
          setUsers(userList);
        }
      } catch (err) {
        console.error("Unable to fetch users:", err);
        if (active) {
          setError("Unable to load users. Please check the users API.");
        }
      } finally {
        if (active) {
          setLoadingUsers(false);
        }
      }
    }

    fetchUsers();

    return () => {
      active = false;
    };
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowUsers(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search users by name or username
  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();

    if (!search) {
      return users.slice(0, INITIAL_USER_COUNT);
    }

    return users.filter((user) => {
      const name = `${user.first_name || ""} ${
        user.last_name || ""
      }`.toLowerCase();

      const username = (user.username || "").toLowerCase();
      const email = (user.email || "").toLowerCase();

      return (
        name.includes(search) ||
        username.includes(search) ||
        email.includes(search)
      );
    });
  }, [users, userSearch]);

  const selectedUser = users.find(
    (user) => String(user.id) === String(formData.assigned_to)
  );

  function getUserName(user) {
    return (
      `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
      user.username ||
      user.email ||
      `User ${user.id}`
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function selectUser(user) {
    setFormData((previous) => ({
      ...previous,
      assigned_to: String(user.id),
    }));

    setUserSearch("");
    setShowUsers(false);
  }

  function clearSelectedUser() {
    setFormData((previous) => ({
      ...previous,
      assigned_to: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    if (!formData.due_date) {
      setError("Please select a due date.");
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority,
      status: formData.status,
      due_date: formData.due_date,
    };

    if (formData.assigned_to) {
      payload.assigned_to = Number(formData.assigned_to);
    }

    try {
      setSubmitting(true);

      await api.post("/tasks/", payload);

      setSuccess("Task created successfully!");

      setTimeout(() => {
        navigate("/tasks");
      }, 1000);
    } catch (err) {
      console.error("Task creation failed:", err);

      const responseData = err.response?.data;

      if (responseData && typeof responseData === "object") {
        const firstError = Object.entries(responseData)
          .map(([field, messages]) => {
            const message = Array.isArray(messages)
              ? messages.join(", ")
              : String(messages);

            return `${field}: ${message}`;
          })[0];

        setError(firstError || "Unable to create task.");
      } else {
        setError("Unable to create task. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="create-task-page">
      <div className="create-task-heading">
        <div>
          <p className="create-task-breadcrumb">Workspace / Tasks</p>
          <h1>Create New Task</h1>
          <p className="create-task-subtitle">
            Add task details, set a deadline, and assign it to a team member.
          </p>
        </div>

        <button
          type="button"
          className="cancel-task-button"
          onClick={() => navigate("/tasks")}
        >
          Cancel
        </button>
      </div>

      <form className="create-task-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2>Task Information</h2>
          <p className="form-section-description">
            Enter the basic details of your task.
          </p>

          <div className="form-field">
            <label htmlFor="title">
              Task Title <span>*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Enter task title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe the task..."
              rows="4"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Task Settings</h2>
          <p className="form-section-description">
            Configure priority, status, deadline, and assignment.
          </p>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="due_date">
                Due Date <span>*</span>
              </label>
              <input
                id="due_date"
                name="due_date"
                type="date"
                value={formData.due_date}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="form-field" ref={dropdownRef}>
              <label>Assign To</label>

              <div className="user-select-box">
                {selectedUser ? (
                  <div className="selected-user">
                    <div className="user-avatar">
                      {getUserName(selectedUser).charAt(0).toUpperCase()}
                    </div>

                    <span>{getUserName(selectedUser)}</span>

                    <button
                      type="button"
                      onClick={clearSelectedUser}
                      aria-label="Remove selected user"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onFocus={() => setShowUsers(true)}
                    onChange={(event) => {
                      setUserSearch(event.target.value);
                      setShowUsers(true);
                    }}
                    aria-label="Search users"
                  />
                )}

                {selectedUser && (
                  <button
                    type="button"
                    className="change-user-button"
                    onClick={() => {
                      clearSelectedUser();
                      setShowUsers(true);
                    }}
                  >
                    Change
                  </button>
                )}
              </div>

              {showUsers && !selectedUser && (
                <div className="user-dropdown">
                  {loadingUsers ? (
                    <p className="user-dropdown-message">
                      Loading users...
                    </p>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <button
                        type="button"
                        className="user-option"
                        key={user.id}
                        onClick={() => selectUser(user)}
                      >
                        <div className="user-avatar">
                          {getUserName(user).charAt(0).toUpperCase()}
                        </div>

                        <div className="user-option-details">
                          <strong>{getUserName(user)}</strong>
                          <span>{user.email || user.username}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="user-dropdown-message">
                      No matching users found.
                    </p>
                  )}

                  {!userSearch.trim() && users.length > 5 && (
                    <p className="user-dropdown-hint">
                      Showing first 5 users. Search to find others.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <div className="task-message error-message">{error}</div>}

        {success && (
          <div className="task-message success-message">{success}</div>
        )}

        <div className="create-task-actions">
          <button
            type="button"
            className="cancel-task-button"
            onClick={() => navigate("/tasks")}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="submit-task-button"
            disabled={submitting}
          >
            {submitting ? "Creating Task..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateTaskPage;
