// src/components/TaskTable.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./TaskTable.css"; // ✅ import styles

export default function TaskTable() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [form, setForm] = useState({});
  const [userId, setUserId] = useState(null);

  const dropdownOptions = {
    product: ["AC", "REF", "MWO", "WP", "CC"],
    status: ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"],
    priority: ["High", "Medium", "Low", "Urgent"],
    task_type: [
      "Development","Prototyping","Testing","Documentation","Analysis",
      "Experimentation","Design","Cost Optimization","Innovation","New Model"
    ],
    static_assigned_by: [
      "R&D Head","ED Sir","FH Sir","Sazibul","Ashraful",
      "Hasib","Sufian","Operation","QA","Sumon Khan","Self"
    ]
  };

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error) setUserId(data?.session?.user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!userId) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (!error) setTasks(data || []);
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
      if (name === "completion_date" && value) updated.status = "Completed";
      return updated;
    });
  };

  const handleCancel = () => {
    setEditingTaskId(null);
    setForm({});
  };

  const buildUpdatePayload = (f) => {
    let assignedByUUID = null;
    let assignedByLabel = null;
    if (f.assigned_by?.match(/^[0-9a-f-]{8}-/)) {
      assignedByUUID = f.assigned_by;
    } else if (f.assigned_by) {
      assignedByLabel = f.assigned_by;
    }

    return {
      task_title: f.task_title?.trim() || "",
      product: f.product || null,
      status: f.status || null,
      priority: f.priority || null,
      task_type: f.task_type || null,
      start_date: f.start_date || null,
      deadline: f.deadline || null,
      completion_date: f.completion_date || null,
      remarks: f.remarks?.trim() || null,
      linked_folder: f.linked_folder || null,
      assigned_by: assignedByUUID,
      assigned_by_label: assignedByLabel,
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
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === editingTaskId ? { ...t, ...updates } : t))
    );
    handleCancel();
  };

  const getBadgeClass = (type, value) => {
    if (!value) return "badge gray";
    return `badge ${type}-${value.toLowerCase().replace(/\s+/g, "-")}`;
  };

  if (loading) return <p>Loading tasks...</p>;
  if (!tasks.length) return <p style={{ textAlign: "center" }}>No tasks found</p>;

  return (
    <>
      <div
        className={`gridWrapper ${editingTaskId ? "blurred" : ""}`}
      >
        {tasks.map((task) => {
          const displayTitle = task.task_title ?? task.title ?? "(Untitled)";
          const assignedByDisplay = task.assigned_by_label || task.assigned_by || "-";

          return (
            <div
              key={task.id}
              className="card"
              onClick={() => handleEditClick(task)}
            >
              <strong>{displayTitle}</strong>
              <div className="badgeRow">
                <span className={getBadgeClass("product", task.product)}>
                  {task.product}
                </span>
                <span className={getBadgeClass("status", task.status)}>
                  {task.status}
                </span>
                <span className={getBadgeClass("priority", task.priority)}>
                  {task.priority}
                </span>
              </div>
              <p className="assignedBy">👤 Assigned By: {assignedByDisplay}</p>
            </div>
          );
        })}
      </div>

      {editingTaskId && (
        <div className="modalOverlay" onClick={handleCancel}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>Edit Task</h2>
              <button className="closeX" onClick={handleCancel}>×</button>
            </div>
            <form className="form" onSubmit={(e) => e.preventDefault()}>
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

              <div className="buttonRow">
                <button type="button" className="actionBtn save" onClick={handleSave}>✔ Save</button>
                <button type="button" className="actionBtn cancel" onClick={handleCancel}>✖ Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
