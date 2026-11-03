
import { useCallback, useEffect, useState } from "react";
import { apiV1 } from "../../api";
import "./Dashboard.css";

const PAGE_SIZE = 10;
const USERS_API_URL = "/accounts/users/";

// ---------- Helper functions ----------

function getProfileData(data) {
  return data?.profile || data?.user || data;
}

function getUserRole(user) {
  return String(user?.role || user?.user_role || "")
    .trim()
    .toLowerCase();
}

function getUserId(user) {
  return user?.id ?? user?.user_id ?? user?.pk ?? null;
}

function getTaskCreatorId(task) {
  const creator =
    task?.created_by ??
    task?.created_by_details ??
    task?.creator ??
    task?.owner;

  if (creator && typeof creator === "object") {
    return creator.id ?? creator.user_id ?? creator.pk ?? null;
  }

  return (
    task?.created_by_id ??
    task?.creator_id ??
    task?.owner_id ??
    creator ??
    null
  );
}

function canEditTask(task, user) {
  if (getUserRole(user) === "admin") return true;

  const userId = getUserId(user);
  const creatorId = getTaskCreatorId(task);

  if (userId == null || creatorId == null) return false;

  return String(userId) === String(creatorId);
}

function canDeleteTask(user) {
  return getUserRole(user) === "admin";
}

function getStatus(task) {
  return String(task?.status || "pending").replaceAll("_", " ");
}

function getPriority(task) {
  return String(task?.priority || "medium");
}

function getAssignee(task) {
  const directName =
    task?.assigned_to_name ??
    task?.assignee_name ??
    task?.assigned_user_name ??
    task?.assigned_to_full_name;

  if (typeof directName === "string" && directName.trim()) {
    return directName.trim();
  }

  const username =
    task?.assigned_to_username ??
    task?.assignee_username ??
    task?.assigned_user_username;

  if (typeof username === "string" && username.trim()) {
    return username.trim();
  }

  const assignee =
    task?.assigned_to_details ??
    task?.assigned_user ??
    task?.assignee ??
    (typeof task?.assigned_to === "object"
      ? task.assigned_to
      : null);

  if (assignee && typeof assignee === "object") {
    const fullName =
      `${assignee.first_name || ""} ${assignee.last_name || ""}`.trim();

    return (
      fullName ||
      assignee.full_name ||
      assignee.name ||
      assignee.username ||
      assignee.email ||
      "Unassigned"
    );
  }

  return "Unassigned";
}

function getAssignedUserId(task) {
  const assigned =
    task?.assigned_to ??
    task?.assigned_to_details ??
    task?.assigned_user ??
    task?.assignee;

  if (assigned && typeof assigned === "object") {
    return assigned.id ?? assigned.user_id ?? assigned.pk ?? "";
  }

  return assigned ?? "";
}

function getUserName(user) {
  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim();

  return (
    fullName ||
    user?.full_name ||
    user?.name ||
    user?.username ||
    user?.email ||
    "Unnamed user"
  );
}

function getUserSearchText(user) {
  return [
    user?.first_name,
    user?.last_name,
    user?.full_name,
    user?.name,
    user?.username,
    user?.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getTaskList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status) {
  return `dashboard-status status-${status
    .toLowerCase()
    .replaceAll(" ", "-")}`;
}

function priorityClass(priority) {
  return `dashboard-priority priority-${priority.toLowerCase()}`;
}

function getApiErrorMessage(err) {
  const data = err.response?.data;

  if (!data) {
    return "Unable to complete the request. Please try again.";
  }

  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.message) return data.message;

  return Object.entries(data)
    .map(([field, messages]) => {
      const message = Array.isArray(messages)
        ? messages.join(" ")
        : typeof messages === "object"
          ? JSON.stringify(messages)
          : String(messages);

      const fieldName =
        field === "non_field_errors"
          ? "Validation"
          : field.replaceAll("_", " ");

      return `${fieldName}: ${message}`;
    })
    .join(" | ");
}

// ---------- Dashboard component ----------

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);

  const [page, setPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  // Counts across all pages.
  const [allPendingCount, setAllPendingCount] = useState(0);
  const [allCompletedCount, setAllCompletedCount] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [editingTask, setEditingTask] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [showUserOptions, setShowUserOptions] = useState(false);

  // Forces a refresh even if the filters and page have not changed.
  const [refreshKey, setRefreshKey] = useState(0);

  const totalPages = Math.max(
    1,
    Math.ceil(totalTasks / PAGE_SIZE)
  );

  // ---------- Fetch profile ----------

  useEffect(() => {
    let active = true;

    async function fetchProfile() {
      try {
        const response = await apiV1.get("/accounts/profile/");

        if (active) {
          setCurrentUser(getProfileData(response.data));
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);

        if (active) {
          setActionError(
            "Unable to identify your user role. Please log in again."
          );
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  // ---------- Fetch users ----------

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);

    try {
      const response = await apiV1.get(USERS_API_URL);
      setUsers(getTaskList(response.data));
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setUsers([]);

      setActionError(
        "Unable to load users for assignment. Check the users API endpoint."
      );
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ---------- Fetch tasks ----------

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        limit: PAGE_SIZE,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (priorityFilter) {
        params.priority = priorityFilter;
      }

      const response = await apiV1.get("/tasks/", { params });
      const data = response.data;
      const list = getTaskList(data);

      setTasks(list);

      setTotalTasks(
        typeof data?.count === "number"
          ? data.count
          : list.length
      );
    } catch (err) {
      console.error("Failed to fetch tasks:", err);

      setError(getApiErrorMessage(err));
      setTasks([]);
      setTotalTasks(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter, refreshKey]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ---------- Fetch counts across all pages ----------

  const fetchTaskCounts = useCallback(async () => {
    try {
      const [completedResponse, pendingResponse] =
        await Promise.all([
          apiV1.get("/tasks/", {
            params: {
              status: "completed",
              page: 1,
              limit: 1,
            },
          }),
          apiV1.get("/tasks/", {
            params: {
              status: "pending",
              page: 1,
              limit: 1,
            },
          }),
        ]);

      const completedData = completedResponse.data;
      const pendingData = pendingResponse.data;

      setAllCompletedCount(
        typeof completedData?.count === "number"
          ? completedData.count
          : getTaskList(completedData).length
      );

      setAllPendingCount(
        typeof pendingData?.count === "number"
          ? pendingData.count
          : getTaskList(pendingData).length
      );
    } catch (err) {
      console.error("Failed to fetch task counts:", err);
    }
  }, []);

  useEffect(() => {
    fetchTaskCounts();
  }, [fetchTaskCounts, refreshKey]);

  // ---------- User dropdown ----------

  const filteredUsers = users
    .filter((user) =>
      getUserSearchText(user).includes(
        userSearch.trim().toLowerCase()
      )
    )
    .slice(0, userSearch.trim() ? users.length : 5);

  const selectedUser = users.find(
    (user) =>
      String(getUserId(user)) ===
      String(editingTask?.assigned_to)
  );

  function handleSelectUser(user) {
    setEditingTask((current) => ({
      ...current,
      assigned_to: getUserId(user),
    }));

    setUserSearch("");
    setShowUserOptions(false);
  }

  // ---------- Filters ----------

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setPage(1);
  }

  // ---------- Edit task ----------

  async function handleEditClick(task) {
    if (!canEditTask(task, currentUser)) {
      setActionError("You are not allowed to edit this task.");
      return;
    }

    setActionMessage("");
    setActionError("");
    setUserSearch("");
    setShowUserOptions(false);

    const dueDate = getDateInputValue(task.due_date);

    setEditingTask({
      id: task.id,
      title: task.title || "",
      description: task.description || "",
      priority: String(task.priority || "medium").toLowerCase(),
      status: String(task.status || "pending").toLowerCase(),
      due_date: dueDate,
      original_due_date: dueDate,
      assigned_to: getAssignedUserId(task),
    });

    await fetchUsers();
  }

  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditingTask((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // ---------- Update task ----------

  async function handleUpdateTask(event) {
    event.preventDefault();

    if (!editingTask) return;

    const originalTask = tasks.find(
      (task) => String(task.id) === String(editingTask.id)
    );

    if (!originalTask || !canEditTask(originalTask, currentUser)) {
      setActionError("You are not allowed to edit this task.");
      setEditingTask(null);
      return;
    }

    const title = editingTask.title.trim();

    if (title.length < 3) {
      setActionError("Task title must contain at least 3 characters.");
      return;
    }

    const payload = {
      title,
      description: editingTask.description,
      priority: editingTask.priority.toLowerCase(),
      status: editingTask.status.toLowerCase(),
      assigned_to: editingTask.assigned_to || null,
    };

    const originalDueDate = editingTask.original_due_date || "";
    const updatedDueDate = editingTask.due_date || "";

    // Send due_date only when changed.
    if (updatedDueDate !== originalDueDate) {
      payload.due_date = updatedDueDate || null;
    }

    // Completed tasks cannot have future due dates.
    if (
      payload.status === "completed" &&
      updatedDueDate &&
      updatedDueDate > getTodayDate()
    ) {
      payload.due_date = null;
    }

    setSaving(true);
    setActionMessage("");
    setActionError("");

    try {
      await apiV1.patch(
        `/tasks/${editingTask.id}/`,
        payload
      );

      setEditingTask(null);
      setShowUserOptions(false);
      setActionMessage("Task updated successfully.");

      // Clear filters so the updated task is not hidden.
      setSearch("");
      setStatusFilter("");
      setPriorityFilter("");
      setPage(1);

      // Force a fresh task-list request and count refresh.
      setRefreshKey((current) => current + 1);
    } catch (err) {
      console.error("Failed to update task:", err);
      console.error("Backend validation response:", err.response?.data);

      setActionError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // ---------- Delete task ----------

  async function handleDeleteTask(taskId) {
    if (!canDeleteTask(currentUser)) {
      setActionError("Only Admin can delete tasks.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    setDeletingId(taskId);
    setActionMessage("");
    setActionError("");

    try {
      await apiV1.delete(`/tasks/${taskId}/`);

      setActionMessage("Task deleted successfully.");

      if (tasks.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
      setActionError(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  // ---------- Dashboard UI ----------

  return (
    <section className="dashboard-page">

      <div className="dashboard-welcome">
        <div>
          <p className="dashboard-eyebrow">YOUR WORKSPACE</p>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">
            Here's an overview of your tasks. Let's make today productive.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-button button-secondary"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={loading}
        >
          ↻ {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Dashboard statistics */}

      <div className="dashboard-stats">

        <article className="dashboard-stat-card">
          <div className="stat-card-heading">
            <span>Total tasks</span>
            <span className="stat-icon stat-blue">☷</span>
          </div>

          <strong className="stat-number">{totalTasks}</strong>

          <span className="stat-caption">
            Matching your filters
          </span>
        </article>

        <article className="dashboard-stat-card">
          <div className="stat-card-heading">
            <span>Pending</span>
            <span className="stat-icon stat-orange">◴</span>
          </div>

          <strong className="stat-number">
            {allPendingCount}
          </strong>

          <span className="stat-caption">
            Total pending tasks
          </span>
        </article>

        <article className="dashboard-stat-card">
          <div className="stat-card-heading">
            <span>Completed</span>
            <span className="stat-icon stat-green">✓</span>
          </div>

          <strong className="stat-number">
            {allCompletedCount}
          </strong>

          <span className="stat-caption">
            Total completed tasks
          </span>
        </article>

      </div>

      {/* Task list */}

      <section className="dashboard-task-panel" id="tasks">

        <div className="task-panel-heading">
          <div>
            <h2>All tasks</h2>
            <p>Search, filter and review your tasks.</p>
          </div>
        </div>

        {/* Search and filters */}

        <div className="dashboard-filters">

          <label className="dashboard-search">
            <span aria-hidden="true">⌕</span>

            <input
              type="search"
              value={search}
              placeholder="Search tasks..."
              aria-label="Search tasks"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <button
            type="button"
            className="dashboard-button button-secondary"
            onClick={clearFilters}
          >
            Clear
          </button>

        </div>

        {/* Messages */}

        {actionMessage && (
          <div className="dashboard-success" role="status">
            {actionMessage}
          </div>
        )}

        {actionError && (
          <div className="dashboard-error" role="alert">
            {actionError}
            <button
              type="button"
              onClick={() => setActionError("")}
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="dashboard-error" role="alert">
            {error}

            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              Try again
            </button>
          </div>
        )}

        {/* Edit form */}

        {editingTask && (
          <div className="dashboard-edit-panel">

            <div className="task-panel-heading">
              <div>
                <h2>Edit Task</h2>
                <p>Update the task details below.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateTask}>

              <div className="dashboard-edit-grid">

                <label>
                  Task title

                  <input
                    type="text"
                    name="title"
                    value={editingTask.title}
                    onChange={handleEditChange}
                    minLength={3}
                    required
                  />
                </label>

                <label>
                  Due date

                  <input
                    type="date"
                    name="due_date"
                    value={editingTask.due_date}
                    min={getTodayDate()}
                    onChange={handleEditChange}
                  />
                </label>

                <label>
                  Priority

                  <select
                    name="priority"
                    value={editingTask.priority}
                    onChange={handleEditChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label>
                  Status

                  <select
                    name="status"
                    value={editingTask.status}
                    onChange={handleEditChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>

                <label className="dashboard-edit-description">
                  Description

                  <textarea
                    name="description"
                    value={editingTask.description}
                    onChange={handleEditChange}
                    rows={4}
                  />
                </label>

                {/* Assign To dropdown */}

                <div className="dashboard-edit-description">

                  <label htmlFor="edit-user-search">
                    Assign To
                  </label>

                  <div className="dashboard-user-select">

                    <button
                      type="button"
                      className="dashboard-user-select-button"
                      onClick={() =>
                        setShowUserOptions((current) => !current)
                      }
                      disabled={usersLoading}
                    >
                      <span>
                        {usersLoading
                          ? "Loading users..."
                          : selectedUser
                            ? getUserName(selectedUser)
                            : "Select a user"}
                      </span>

                      <span aria-hidden="true">⌄</span>
                    </button>

                    {showUserOptions && (
                      <div className="dashboard-user-dropdown">

                        <input
                          id="edit-user-search"
                          type="search"
                          value={userSearch}
                          placeholder="Search by name, username or email..."
                          onChange={(event) =>
                            setUserSearch(event.target.value)
                          }
                          autoFocus
                        />

                        <div className="dashboard-user-options">

                          <button
                            type="button"
                            onClick={() => {
                              setEditingTask((current) => ({
                                ...current,
                                assigned_to: "",
                              }));

                              setUserSearch("");
                              setShowUserOptions(false);
                            }}
                          >
                            Unassigned
                          </button>

                          {usersLoading ? (
                            <p>Loading users...</p>
                          ) : filteredUsers.length > 0 ? (
                            filteredUsers.map((user, index) => (
                              <button
                                type="button"
                                key={getUserId(user) ?? index}
                                className={
                                  String(editingTask.assigned_to) ===
                                  String(getUserId(user))
                                    ? "selected"
                                    : ""
                                }
                                onClick={() => handleSelectUser(user)}
                              >
                                <strong>{getUserName(user)}</strong>

                                {user.username && (
                                  <small>@{user.username}</small>
                                )}

                                {user.email && (
                                  <small>{user.email}</small>
                                )}
                              </button>
                            ))
                          ) : (
                            <p>No users found.</p>
                          )}

                        </div>
                      </div>
                    )}

                  </div>
                </div>

              </div>

              {/* Edit actions */}

              <div className="dashboard-edit-actions">

                <button
                  type="button"
                  className="dashboard-button button-secondary"
                  onClick={() => {
                    setEditingTask(null);
                    setShowUserOptions(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="dashboard-button"
                  disabled={saving || usersLoading}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

              </div>

            </form>
          </div>
        )}

        {/* Tasks table */}

        <div className="dashboard-table-wrap">

          <table className="dashboard-table">

            <thead>
              <tr>
                <th>Task</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan={6} className="dashboard-table-message">
                    Loading tasks...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="dashboard-table-message">
                    No tasks found. Try changing your filters.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const showEdit = canEditTask(task, currentUser);
                  const showDelete = canDeleteTask(currentUser);

                  return (
                    <tr key={task.id}>

                      <td>
                        <div className="dashboard-task-title">
                          <strong>
                            {task.title || "Untitled task"}
                          </strong>

                          <span>
                            {task.description || "No description"}
                          </span>
                        </div>
                      </td>

                      <td>{getAssignee(task)}</td>

                      <td>
                        <span className={priorityClass(getPriority(task))}>
                          {getPriority(task)}
                        </span>
                      </td>

                      <td>
                        <span className={statusClass(getStatus(task))}>
                          {getStatus(task)}
                        </span>
                      </td>

                      <td>{formatDate(task.due_date)}</td>

                      <td>
                        <div className="dashboard-row-actions">

                          {showEdit && (
                            <button
                              type="button"
                              className="dashboard-edit-button"
                              onClick={() => handleEditClick(task)}
                              disabled={saving || deletingId === task.id}
                            >
                              Edit
                            </button>
                          )}

                          {showDelete && (
                            <button
                              type="button"
                              className="dashboard-delete-button"
                              onClick={() => handleDeleteTask(task.id)}
                              disabled={deletingId === task.id || saving}
                            >
                              {deletingId === task.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          )}

                          {!profileLoading && !showEdit && !showDelete && (
                            <span>—</span>
                          )}

                          {profileLoading && <span>...</span>}

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}

            </tbody>

          </table>

        </div>

        {/* Pagination */}

        <div className="dashboard-pagination">

          <span>
            {totalTasks === 0
              ? "No tasks"
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                  page * PAGE_SIZE,
                  totalTasks
                )} of ${totalTasks} tasks`}
          </span>

          <div className="pagination-controls">

            <button
              type="button"
              className="page-button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              className="page-button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>

          </div>
        </div>

      </section>
    </section>
  );
}
