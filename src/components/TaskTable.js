// src/components/TaskTable.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function TaskTable() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [form, setForm] = useState({});
  const [userId, setUserId] = useState(null); // ✅ track current user

  const dropdownOptions = {
    product: ["AC", "REF", "MWO", "WP", "CC"],
    status: ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"],
    priority: ["High", "Medium", "Low", "Urgent"],
    task_type: [
      "Development", "Prototyping", "Testing", "Documentation", "Analysis",
      "Experimentation", "Design", "Cost Optimization", "Innovation", "New Model"
    ],
    static_assigned_by: [
      "R&D Head", "ED Sir", "FH Sir", "Sazibul", "Ashraful",
      "Hasib", "Sufian", "Operation", "QA", "Sumon Khan", "Self"
    ]
  };

  // 🔹 Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Auth session error:", error);
        return;
      }
      setUserId(data?.session?.user?.id || null);
    };
    getUser();
  }, []);

  // 🔹 Load tasks (only after userId is ready)
  useEffect(() => {
    const fetchTasks = async () => {
      if (!userId) return; // wait for userId

      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Load tasks error:", error);
      } else {
        setTasks(data || []);
      }
      setLoading(false);
    };

    fetchTasks();
  }, [userId]);

  const fmtDateForInput = (val) => (val ? String(val).slice(0, 10) : "");

  const handleEditClick = (task) => {
    setEditingTaskId(task.id);
    setForm({
      ...task,
      start_date: fmtDateForInput(task.start_date),
      deadline: fmtDateForInput(task.deadline),
      completion_date: fmtDateForInput(task.completion_date),
      task_title: task.task_title ?? task.title ?? "",
      assigned_by: task.assigned_by || task.assigned_by_label || ""
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };

      // 🔹 Auto-update status if completion_date is set
      if (name === "completion_date" && value) {
        updated.status = "Completed";
      }

      return updated;
    });
  };

  const handleCancel = () => {
    setEditingTaskId(null);
    setForm({});
  };

  // 🔒 Safe update payload
  const buildUpdatePayload = (currentForm) => {
    let assignedByUUID = null;
    let assignedByLabel = null;

    if (currentForm.assigned_by?.match(/^[0-9a-f-]{8}-/)) {
      assignedByUUID = currentForm.assigned_by;
    } else if (currentForm.assigned_by) {
      assignedByLabel = currentForm.assigned_by;
    }

    return {
      task_title: currentForm.task_title?.trim() || "",
      product: currentForm.product || null,
      status: currentForm.status || null,
      priority: currentForm.priority || null,
      task_type: currentForm.task_type || null,
      start_date: currentForm.start_date || null,
      deadline: currentForm.deadline || null,
      completion_date: currentForm.completion_date || null,
      remarks: currentForm.remarks?.trim() || null,
      linked_folder: currentForm.linked_folder || null,
      assigned_by: assignedByUUID,
      assigned_by_label: assignedByLabel
      // 🚫 created_by & assigned_to are intentionally excluded
    };
  };

  const handleSave = async () => {
    const updates = buildUpdatePayload(form);

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", editingTaskId);

    if (error) {
      alert("Error updating task: " + error.message);
      console.error("Update error:", error, { updates });
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingTaskId ? { ...t, ...updates } : t
      )
    );
    handleCancel();
  };

  const getBadgeStyle = (type, value) => {
    switch (type) {
      case "product":
        return {
          AC: { bg: "#007bff", color: "#fff" },
          REF: { bg: "#28a745", color: "#fff" },
          MWO: { bg: "#ffc107", color: "#000" },
          WP: { bg: "#17a2b8", color: "#fff" },
          CC: { bg: "#6f42c1", color: "#fff" },
        }[value] || { bg: "#6c757d", color: "#fff" };
      case "status":
        return {
          "Not Started": { bg: "#6c757d", color: "#fff" },
          "In Progress": { bg: "#17a2b8", color: "#fff" },
          "On Hold": { bg: "#ffc107", color: "#000" },
          "Completed": { bg: "#28a745", color: "#fff" },
          "Cancelled": { bg: "#dc3545", color: "#fff" },
        }[value] || { bg: "#6c757d", color: "#fff" };
      case "priority":
        return {
          High: { bg: "#dc3545", color: "#fff" },
          Medium: { bg: "#ffc107", color: "#000" },
          Low: { bg: "#28a745", color: "#fff" },
          Urgent: { bg: "#6f42c1", color: "#fff" },
        }[value] || { bg: "#6c757d", color: "#fff" };
      default:
        return { bg: "#6c757d", color: "#fff" };
    }
  };

  if (loading) return <p>Loading tasks...</p>;
  if (!tasks || tasks.length === 0)
    return <p style={{ textAlign: "center" }}>No tasks found</p>;

  return (
    <>
      {/* 🔹 Grid of tasks with blur when modal is open */}
      <div
        style={{
          ...styles.gridWrapper,
          filter: editingTaskId ? "blur(5px)" : "none",
          pointerEvents: editingTaskId ? "none" : "auto"
        }}
      >
        {tasks.map((task) => {
          const displayTitle = task.task_title ?? task.title ?? "(Untitled)";
          const productBadge = getBadgeStyle("product", task.product);
          const statusBadge = getBadgeStyle("status", task.status);
          const priorityBadge = getBadgeStyle("priority", task.priority);

          const assignedByDisplay =
            task.assigned_by_label || task.assigned_by || "-";

          return (
            <div
              key={task.id}
              style={styles.card}
              onClick={() => handleEditClick(task)}
            >
              <strong>{displayTitle}</strong>
              <div style={styles.badgeRow}>
                <span style={{ ...styles.badge, backgroundColor: productBadge.bg, color: productBadge.color }}>
                  {task.product}
                </span>
                <span style={{ ...styles.badge, backgroundColor: statusBadge.bg, color: statusBadge.color }}>
                  {task.status}
                </span>
                <span style={{ ...styles.badge, backgroundColor: priorityBadge.bg, color: priorityBadge.color }}>
                  {task.priority}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#666" }}>
                👤 Assigned By: {assignedByDisplay}
              </p>
            </div>
          );
        })}
      </div>

      {/* 🔹 Modal overlay */}
      {editingTaskId && (
        <div style={styles.modalOverlay} onClick={handleCancel}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0 }}>Edit Task</h2>
              <button style={styles.closeX} onClick={handleCancel}>×</button>
            </div>
            <form style={styles.form} onSubmit={(e) => e.preventDefault()}>
              <label>Task Title</label>
              <input name="task_title" value={form.task_title || ""} onChange={handleChange} />

              <label>Product</label>
              <select name="product" value={form.product || ""} onChange={handleChange}>
                <option value="">Select Product</option>
                {dropdownOptions.product.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <label>Status</label>
              <select name="status" value={form.status || ""} onChange={handleChange}>
                <option value="">Select Status</option>
                {dropdownOptions.status.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <label>Priority</label>
              <select name="priority" value={form.priority || ""} onChange={handleChange}>
                <option value="">Select Priority</option>
                {dropdownOptions.priority.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <label>Assigned By</label>
              <select name="assigned_by" value={form.assigned_by || ""} onChange={handleChange}>
                <option value="">Select Assigner</option>
                {dropdownOptions.static_assigned_by.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <label>Task Type</label>
              <select name="task_type" value={form.task_type || ""} onChange={handleChange}>
                <option value="">Select Type</option>
                {dropdownOptions.task_type.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <label>Start Date</label>
              <input type="date" name="start_date" value={form.start_date || ""} onChange={handleChange} />

              <label>Deadline</label>
              <input type="date" name="deadline" value={form.deadline || ""} onChange={handleChange} />

              <label>Completion Date</label>
              <input type="date" name="completion_date" value={form.completion_date || ""} onChange={handleChange} />

              <label>Remarks</label>
              <input name="remarks" value={form.remarks || ""} onChange={handleChange} />

              <label>Linked Folder</label>
              <input name="linked_folder" value={form.linked_folder || ""} onChange={handleChange} />

              <div style={styles.buttonRow}>
                <button
                  type="button"
                  style={{ ...styles.actionBtn, background: "#28a745" }}
                  onClick={handleSave}
                >
                  ✔ Save
                </button>
                <button
                  type="button"
                  style={{ ...styles.actionBtn, background: "#dc3545" }}
                  onClick={handleCancel}
                >
                  ✖ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  gridWrapper: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
    transition: "filter 0.3s ease"
  },
  card: {
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "16px",
    background: "#fff",
    boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  badgeRow: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    margin: "12px 0",
    flexWrap: "wrap",
  },
  badge: {
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "center",
    minWidth: "80px",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modalContent: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    width: "92%",
    maxWidth: "760px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
    position: "relative",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  closeX: {
    background: "transparent",
    border: "none",
    fontSize: "24px",
    lineHeight: 1,
    cursor: "pointer",
  },
  form: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  buttonRow: {
    gridColumn: "1 / -1",
    display: "flex",
    gap: "12px",
    marginTop: "12px",
  },
  actionBtn: {
    flex: 1,
    padding: "12px",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
};
