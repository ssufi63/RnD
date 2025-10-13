import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import toast from "react-hot-toast";

export default function TaskFormModal({ project, columnId, onClose, onTaskAdded }) {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    task_title: "",
    product: "",
    status: "",
    priority: "",
    task_type: "",
    start_date: "",
    deadline: ""
  });

  // Dropdown options (same as TaskForm)
  const dropdownOptions = {
    product: ["AC", "REF", "MWO", "WP", "CC"],
    status: ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"],
    priority: ["High", "Medium", "Low", "Urgent"],
    task_type: [
      "Development", "Prototyping", "Testing", "Documentation", "Analysis",
      "Experimentation", "Design", "Cost Optimization", "Innovation", "New Model", "Mold Repair"
    ]
  };

  // ✅ Get current logged-in user
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("User fetch error:", error.message);
      setUser(data?.user || null);
    })();
  }, []);

  // ✅ Handle form input
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ✅ Submit new task
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.task_title || !form.product || !form.status || !form.priority) {
      return toast.error("Please fill all required fields");
    }

    if (form.start_date && form.deadline && form.deadline < form.start_date) {
      return toast.error("Deadline cannot be before start date");
    }

    if (!project?.project_id) return toast.error("Invalid project");

    setSaving(true);

    try {
      const { data: inserted, error } = await supabase
        .from("kanban_tasks")
        .insert([
          {
            project_id: project.project_id,
            column_id: columnId || null,
            title: form.task_title.trim(),
            product: form.product,
            status: form.status,
            priority: form.priority,
            task_type: form.task_type || null,
            start_date: form.start_date || null,
            deadline: form.deadline || null,
            created_by: user?.id || null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Add system remark
      await supabase.from("project_remarks").insert([
        {
          project_id: project.project_id,
          user_id: user?.id || null,
          remark: `System: Task "${inserted.title}" created.`,
          type: "system"
        }
      ]);

      toast.success("Task created successfully!");
      onTaskAdded?.(inserted.title);
      onClose?.();
    } catch (err) {
      console.error("Task creation failed:", err);
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add Task</h3>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Task Title */}
          <div className="formRow full">
            <label>Task Title</label>
            <input
              name="task_title"
              value={form.task_title}
              onChange={handleChange}
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Product / Status / Priority */}
          <div className="formRow">
            <div>
              <label>Product</label>
              <select name="product" value={form.product} onChange={handleChange} required>
                <option value="">Select Product</option>
                {dropdownOptions.product.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange} required>
                <option value="">Select Status</option>
                {dropdownOptions.status.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} required>
                <option value="">Select Priority</option>
                {dropdownOptions.priority.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Type / Dates */}
          <div className="formRow">
            <div>
              <label>Task Type</label>
              <select name="task_type" value={form.task_type} onChange={handleChange}>
                <option value="">Select Type</option>
                {dropdownOptions.task_type.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Start Date</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} />
            </div>

            <div>
              <label>Deadline</label>
              <input type="date" name="deadline" value={form.deadline} onChange={handleChange} />
            </div>
          </div>

          {/* Buttons */}
          <div className="modal-actions">
            <button type="button" className="btn-gray" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-blue" disabled={saving}>
              {saving ? "Saving..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>

      {/* Styling */}
      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-card {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          width: 480px;
          max-width: calc(100vw - 24px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
          animation: fadeIn 0.2s ease-in-out;
        }
        .modal-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 14px;
          color: #111827;
          text-align: center;
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .formRow {
          display: flex;
          gap: 10px;
          justify-content: space-between;
        }
        .formRow.full {
          flex-direction: column;
        }
        .formRow label {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }
        .formRow input,
        .formRow select {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 14px;
        }
        .formRow input:focus,
        .formRow select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 14px;
        }
        .btn-blue {
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-blue:hover {
          background: #1d4ed8;
        }
        .btn-gray {
          background: #f3f4f6;
          color: #111827;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 8px 14px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-gray:hover {
          background: #e5e7eb;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
