import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import toast from "react-hot-toast";

export default function TaskFormModal({
  project,
  columnId,
  onClose,
  onTaskAdded,
}) {
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  // ✅ Fetch logged-in user once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("User fetch error:", error.message);
      setUser(data?.user || null);
    })();
  }, []);

  // ✅ Handle task creation
  const submit = async (e) => {
    e.preventDefault();

    if (!title.trim()) return toast.error("Task title is required");
    if (!project?.project_id) return toast.error("Invalid project");

    setSaving(true);
    try {
      // 🟢 1. Insert into kanban_tasks
      const { data: inserted, error } = await supabase
        .from("kanban_tasks")
        .insert([
          {
            project_id: project.project_id,
            column_id: columnId || null,
            title: title.trim(),
            description: desc.trim() || null,
            deadline: deadline || null,
            status: "To Do",
            created_by: user?.id || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // 🟣 2. Create a system remark for audit trail
      await supabase.from("project_remarks").insert([
        {
          project_id: project.project_id,
          user_id: user?.id || null,
          remark: `System: Task "${inserted.title}" created.`,
          type: "system",
        },
      ]);

      // 🟠 3. Success feedback
      toast.success("Task added successfully!");

      // 🟡 4. Trigger parent refresh
      onTaskAdded?.(inserted.title);

      // 🟢 5. Close modal
      onClose?.();
    } catch (err) {
      console.error("Task creation failed:", err);
      toast.error("Failed to add task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add Task</h3>

        <form onSubmit={submit} className="modal-form">
          <label className="modal-label">Title</label>
          <input
            className="modal-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />

          <label className="modal-label">Description</label>
          <textarea
            className="modal-input"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Optional description"
          />

          <label className="modal-label">Deadline</label>
          <input
            type="date"
            className="modal-input"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <div className="modal-actions">
            <button
              type="button"
              className="btn-gray"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-blue"
              disabled={saving || !title.trim()}
            >
              {saving ? "Saving..." : "Add Task"}
            </button>
          </div>
        </form>
      </div>

      {/* ✨ Styling */}
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
          background: #ffffff;
          border-radius: 12px;
          padding: 20px;
          width: 420px;
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
          gap: 10px;
        }
        .modal-label {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }
        .modal-input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 14px;
        }
        .modal-input:focus {
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
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
