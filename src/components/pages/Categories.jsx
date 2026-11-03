
import { useEffect, useState } from "react";
import api from "../../api";
import "./Categories.css";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const isAdmin = role.toLowerCase() === "admin";

  useEffect(() => {
    fetchProfile();
    fetchCategories();
  }, []);

  // Fetch logged-in user's role
  async function fetchProfile() {
    try {
      const response = await api.get("/accounts/profile/");
      setRole(response.data?.role || "");
    } catch (err) {
      console.error("Unable to load user profile:", err);
    }
  }

  // Fetch all categories
  async function fetchCategories() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/categories/");
      const data = response.data;

      if (Array.isArray(data)) {
        setCategories(data);
      } else if (Array.isArray(data?.results)) {
        setCategories(data.results);
      } else if (Array.isArray(data?.data)) {
        setCategories(data.data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error("Unable to fetch categories:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to load categories. Please try again."
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

  // Open create form
  function openCreateForm() {
    setEditingCategory(null);

    setFormData({
      name: "",
      description: "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  // Open edit form
  function openEditForm(category) {
    setEditingCategory(category);

    setFormData({
      name: category.name || "",
      description: category.description || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  // Close form
  function closeForm() {
    setShowForm(false);
    setEditingCategory(null);

    setFormData({
      name: "",
      description: "",
    });
  }

  // Create or update category
  async function handleSubmit(e) {
    e.preventDefault();

    if (!isAdmin) return;

    if (formData.name.trim().length < 3) {
      setError("Category name must contain at least 3 characters.");
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

      if (editingCategory) {
        await api.patch(
          `/categories/${editingCategory.id}/`,
          payload
        );

        setSuccess("Category updated successfully.");
      } else {
        await api.post("/categories/", payload);

        setSuccess("Category created successfully.");
      }

      closeForm();
      await fetchCategories();
    } catch (err) {
      console.error("Unable to save category:", err);

      const responseData = err.response?.data;

      setError(
        responseData?.name?.[0] ||
        responseData?.description?.[0] ||
        responseData?.detail ||
        "Unable to save category. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete category
  async function handleDelete(category) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/categories/${category.id}/`);

      setSuccess("Category deleted successfully.");

      await fetchCategories();
    } catch (err) {
      console.error("Unable to delete category:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to delete category. Please try again."
      );
    }
  }

  return (
    <div className="categories-page">

      {/* Page Header */}
      <div className="categories-header">
        <div>
          <h1>Categories</h1>
          <p>View and manage your task categories.</p>
        </div>

        {isAdmin && (
          <button
            className="category-create-btn"
            onClick={openCreateForm}
          >
            + Create Category
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="category-alert category-error">
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="category-alert category-success">
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      {/* Category Summary */}
      <div className="category-summary">
        <div className="category-summary-icon">▤</div>

        <div>
          <span>Total Categories</span>
          <h2>{categories.length}</h2>
        </div>
      </div>

      {/* Categories List */}
      <div className="categories-section">
        <div className="categories-section-header">
          <div>
            <h2>All Categories</h2>
            <p>List of available categories</p>
          </div>

          <span className="category-count">
            {categories.length} Categories
          </span>
        </div>

        {loading ? (
          <div className="categories-message">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="categories-message">
            <div className="empty-category-icon">▤</div>

            <h3>No categories found</h3>

            <p>There are currently no categories available.</p>

            {isAdmin && (
              <button
                className="category-create-btn"
                onClick={openCreateForm}
              >
                + Create Your First Category
              </button>
            )}
          </div>
        ) : (
          <div className="categories-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Description</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <div className="category-name-cell">
                        <div className="category-table-icon">
                          {category.name?.charAt(0).toUpperCase() || "C"}
                        </div>

                        <strong>{category.name}</strong>
                      </div>
                    </td>

                    <td className="category-description">
                      {category.description || "No description"}
                    </td>

                    {isAdmin && (
                      <td>
                        <div className="category-actions">
                          <button
                            className="category-edit-btn"
                            onClick={() => openEditForm(category)}
                          >
                            Edit
                          </button>

                          <button
                            className="category-delete-btn"
                            onClick={() => handleDelete(category)}
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
        <div className="category-modal-overlay">
          <div className="category-modal">

            <div className="category-modal-header">
              <div>
                <h2>
                  {editingCategory
                    ? "Edit Category"
                    : "Create Category"}
                </h2>

                <p>
                  {editingCategory
                    ? "Update category information."
                    : "Enter the details of your new category."}
                </p>
              </div>

              <button
                type="button"
                className="category-modal-close"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="category-form-group">
                <label htmlFor="category-name">
                  Category Name *
                </label>

                <input
                  id="category-name"
                  type="text"
                  name="name"
                  placeholder="Enter category name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  minLength={3}
                  maxLength={200}
                />
              </div>

              <div className="category-form-group">
                <label htmlFor="category-description">
                  Description
                </label>

                <textarea
                  id="category-description"
                  name="description"
                  placeholder="Enter category description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>

              <div className="category-form-actions">
                <button
                  type="button"
                  className="category-cancel-btn"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="category-create-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingCategory
                    ? "Update Category"
                    : "Create Category"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
