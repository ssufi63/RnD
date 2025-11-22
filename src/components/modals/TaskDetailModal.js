import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./TaskDetailModal.css";

/**
 * Props:
 * - task (object, required)
 * - onClose (fn, required)
 * - onTaskUpdated (fn, optional)  -> parent should refetch tasks/remarks
 */
export default function TaskDetailModal({ task, onClose, onTaskUpdated }) {
  const [assignedUser, setAssignedUser] = useState(null);
  const [creator, setCreator] = useState(null);

  // editing toggles only the fields below; no assign/remarks here
  const [editing, setEditing] = useState(false);

  // editable fields
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [deadline, setDeadline] = useState(""); // <- editable deadline only

  // UI overlays
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // hydrate editable state on open/change
  useEffect(() => {
    if (!task) return;
    setDescription(task.description || "");
    setStatus(task.status || "");

    // completion date as yyyy-mm-dd
    const cd = task.completion_date
      ? new Date(task.completion_date).toISOString().slice(0, 10)
      : "";
    setCompletionDate(cd);

    // deadline as yyyy-mm-dd for the input
    const dl = task.deadline
      ? new Date(task.deadline).toISOString().slice(0, 10)
      : "";
    setDeadline(dl);
  }, [task]);

  // load related profiles for display
  useEffect(() => {
    if (!task) return;
    const loadProfiles = async () => {
      if (task.assigned_to) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name,email")
          .eq("id", task.assigned_to)
          .single();
        setAssignedUser(data || null);
      } else {
        setAssignedUser(null);
      }

      if (task.created_by) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name,email")
          .eq("id", task.created_by)
          .single();
        setCreator(data || null);
      } else {
        setCreator(null);
      }
    };
    loadProfiles();
  }, [task]);

  // SAVE — updates description, status, completion_date, deadline
  const handleSave = async () => {
    if (!task?.id) return;

    const payload = {
      description: description?.trim() || null,
      status: status || null,
      completion_date: completionDate || null,
      deadline: deadline || null, // <- update deadline
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("kanban_tasks")
      .update(payload)
      .eq("id", task.id);

    if (error) {
      console.error("Save error:", error);
      alert("Save failed: " + error.message);
    } else {
      setEditing(false);
      setShowSuccess(true);

      // Refresh the parent after save
      onTaskUpdated && onTaskUpdated();

      // Hide success tick after 1 s
      setTimeout(() => setShowSuccess(false), 1000);
    }
  };

  // Delete with confirm
  const handleDelete = async () => {
    if (!task?.id) return;
    const { error } = await supabase
      .from("kanban_tasks")
      .delete()
      .eq("id", task.id);

    if (!error) {
      setShowDeleteConfirm(false);
      setShowSuccess(true);
      // let parent refresh & close after the tick
      onTaskUpdated && onTaskUpdated();
      setTimeout(() => {
        setShowSuccess(false);
        onClose && onClose();
      }, 1000);
    }
  };

  if (!task) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>{task.title}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Description */}
          <p className="task-detail">
            <strong>Description:</strong>{" "}
            {editing ? (
              <textarea
                className="modal-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            ) : (
              description || "—"
            )}
          </p>

          {/* Assigned / Creator (read-only here) */}
          {assignedUser && (
            <p className="task-detail">
              <strong>Assigned To:</strong> {assignedUser.full_name} ({assignedUser.email})
            </p>
          )}
          {creator && (
            <p className="task-detail">
              <strong>Created By:</strong> {creator.full_name} ({creator.email})
            </p>
          )}

          {/* Start Date (read-only) */}
          {task.start_date && (
            <p className="task-detail">
              <strong>Start Date:</strong>{" "}
              {new Date(task.start_date).toLocaleDateString()}
            </p>
          )}

          {/* Deadline (editable when editing) */}
          <p className="task-detail">
            <strong>Deadline:</strong>{" "}
            {editing ? (
              <input
                className="modal-input"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            ) : (
              task.deadline
                ? new Date(task.deadline).toLocaleDateString()
                : "—"
            )}
          </p>

          {/* Status */}
          <p className="task-detail">
            <strong>Status:</strong>{" "}
            {editing ? (
              <select
                className="modal-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Select</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            ) : (
              status || "—"
            )}
          </p>

          {/* Completion Date */}
          <p className="task-detail">
            <strong>Completion Date:</strong>{" "}
            {editing ? (
              <input
                className="modal-input"
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
              />
            ) : (
              task.completion_date
                ? new Date(task.completion_date).toLocaleDateString()
                : "—"
            )}
          </p>

          {/* Created / Updated */}
          <p className="task-detail small">
            <strong>Created:</strong>{" "}
            {new Date(task.created_at).toLocaleString()}
          </p>
          <p className="task-detail small">
            <strong>Updated:</strong>{" "}
            {new Date(task.updated_at).toLocaleString()}
          </p>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          {editing ? (
            <button className="btn-blue" onClick={handleSave}>Save</button>
          ) : (
            <button className="btn-blue" onClick={() => setEditing(true)}>Edit</button>
          )}
          <button className="btn-red" onClick={() => setShowDeleteConfirm(true)}>
            Delete
          </button>
          {!editing && (
            <button className="btn-gray" onClick={onClose}>
              Close
            </button>
          )}
        </div>

        {/* Delete confirm */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="delete-confirm-box" onClick={(e) => e.stopPropagation()}>
              <h3>⚠️ Confirm Deletion</h3>
              <p>This action cannot be undone.</p>
              <div className="confirm-actions">
                <button className="btn-red" onClick={handleDelete}>Yes, Delete</button>
                <button className="btn-gray" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Success overlay (1s) */}
        {showSuccess && (
          <div className="success-overlay">
            <div className="success-checkmark">
              <div className="check-icon">
                <span className="icon-line line-tip"></span>
                <span className="icon-line line-long"></span>
                <div className="icon-circle"></div>
                <div className="icon-fix"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
