import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import toast from "react-hot-toast";
/* import "./ModalCommon.css"; */

export default function ProjectFormEdit({ project, onClose, onProjectUpdated }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    deadline: "",
  });
  const [saving, setSaving] = useState(false);

  // Pre-fill form with project details
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        deadline: project.deadline ? project.deadline.split("T")[0] : "",
      });
    }
  }, [project]);

  // Handle field change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Save to Supabase
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Project name is required");

    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({
        name: formData.name.trim(),
        description: formData.description.trim(),
        deadline: formData.deadline
          ? new Date(formData.deadline).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", project.project_id);

    setSaving(false);

    if (error) {
      toast.error("Failed to update project");
      console.error(error);
      return;
    }

    toast.success("Project updated successfully!");
    if (onProjectUpdated) onProjectUpdated();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Project</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Project Name
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Optional project details..."
            />
          </label>

          <label>
            Deadline
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
            />
          </label>

          <div className="modal-actions">
            <button type="submit" className="btn-blue" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" className="btn-gray" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
