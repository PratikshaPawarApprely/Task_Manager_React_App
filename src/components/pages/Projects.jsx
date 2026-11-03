
import { useEffect, useState } from "react";
import api from "../../api";
import "./Projects.css";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const isAdmin = role.toLowerCase() === "admin";

  // Fetch user profile and projects
  useEffect(() => {
    fetchProfile();
    fetchProjects();
  }, []);

  async function fetchProfile() {
    try {
      const response = await api.get("/accounts/profile/");
      setRole(response.data?.role || "");
    } catch (err) {
      console.error("Unable to load profile:", err);
    }
  }

  async function fetchProjects() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/projects/");

      const data = response.data;

      if (Array.isArray(data)) {
        setProjects(data);
      } else if (Array.isArray(data?.results)) {
        setProjects(data.results);
      } else if (Array.isArray(data?.data)) {
        setProjects(data.data);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error("Unable to fetch projects:", err);
      setError(
        err.response?.data?.detail ||
        "Unable to load projects. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openCreateForm() {
    setEditingProject(null);
    setFormData({
      name: "",
      description: "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(project) {
    setEditingProject(project);
    setFormData({
      name: project.name || "",
      description: project.description || "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingProject(null);
    setFormData({
      name: "",
      description: "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!isAdmin) return;

    if (formData.name.trim().length < 3) {
      setError("Project name must contain at least 3 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      };

      if (editingProject) {
        await api.patch(
          `/projects/${editingProject.id}/`,
          payload
        );
        setSuccess("Project updated successfully.");
      } else {
        await api.post("/projects/", payload);
        setSuccess("Project created successfully.");
      }

      closeForm();
      await fetchProjects();
    } catch (err) {
      console.error("Unable to save project:", err);

      const responseData = err.response?.data;

      setError(
        responseData?.name?.[0] ||
        responseData?.detail ||
        "Unable to save project. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(project) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/projects/${project.id}/`);

      setSuccess("Project deleted successfully.");
      await fetchProjects();
    } catch (err) {
      console.error("Unable to delete project:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to delete project. Please try again."
      );
    }
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="projects-page">

      {/* Page Header */}
      <div className="projects-header">
        <div>
          <h1>Projects</h1>
          <p>View and manage your projects in one place.</p>
        </div>

        {isAdmin && (
          <button
            className="project-create-btn"
            onClick={openCreateForm}
          >
            + Create Project
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="project-alert project-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="project-alert project-success">
          {success}
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      {/* Project Count */}
      <div className="project-summary">
        <div className="project-summary-icon">▣</div>
        <div>
          <span>Total Projects</span>
          <h2>{projects.length}</h2>
        </div>
      </div>

      {/* Projects List */}
      <div className="projects-section">
        <div className="projects-section-header">
          <div>
            <h2>All Projects</h2>
            <p>List of available projects</p>
          </div>

          <span className="project-count">
            {projects.length} Projects
          </span>
        </div>

        {loading ? (
          <div className="projects-message">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="projects-message">
            <div className="empty-project-icon">▣</div>
            <h3>No projects found</h3>
            <p>There are currently no projects available.</p>

            {isAdmin && (
              <button
                className="project-create-btn"
                onClick={openCreateForm}
              >
                + Create Your First Project
              </button>
            )}
          </div>
        ) : (
          <div className="projects-table-wrapper">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Description</th>
                  <th>Created At</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <div className="project-name-cell">
                        <div className="project-table-icon">
                          {project.name?.charAt(0).toUpperCase() || "P"}
                        </div>
                        <strong>{project.name}</strong>
                      </div>
                    </td>

                    <td className="project-description">
                      {project.description || "No description"}
                    </td>

                    <td>{formatDate(project.created_at)}</td>

                    {isAdmin && (
                      <td>
                        <div className="project-actions">
                          <button
                            className="project-edit-btn"
                            onClick={() => openEditForm(project)}
                          >
                            Edit
                          </button>

                          <button
                            className="project-delete-btn"
                            onClick={() => handleDelete(project)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showForm && isAdmin && (
        <div className="project-modal-overlay">
          <div className="project-modal">

            <div className="project-modal-header">
              <div>
                <h2>
                  {editingProject ? "Edit Project" : "Create Project"}
                </h2>
                <p>
                  {editingProject
                    ? "Update project information."
                    : "Enter the details of your new project."}
                </p>
              </div>

              <button
                className="project-modal-close"
                onClick={closeForm}
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="project-form-group">
                <label htmlFor="project-name">
                  Project Name *
                </label>

                <input
                  id="project-name"
                  type="text"
                  name="name"
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  minLength={3}
                  maxLength={200}
                />
              </div>

              <div className="project-form-group">
                <label htmlFor="project-description">
                  Description
                </label>

                <textarea
                  id="project-description"
                  name="description"
                  placeholder="Enter project description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>

              {error && (
                <div className="project-alert project-error">
                  {error}
                </div>
              )}

              <div className="project-form-actions">
                <button
                  type="button"
                  className="project-cancel-btn"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="project-create-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProject
                    ? "Update Project"
                    : "Create Project"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
