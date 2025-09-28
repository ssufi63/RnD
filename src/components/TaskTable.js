// src/components/TaskTable.js
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import "./TaskTable.css";

/* -------------------- helpers -------------------- */
const fmtDateForInput = (val) => (val ? String(val).slice(0, 10) : "");
const calcProgress = (task) => {
  if (task.status === "Completed") return 100;
  if (!task.start_date || !task.deadline) return 0;
  const start = new Date(task.start_date);
  const end = new Date(task.deadline);
  const today = new Date();
  if (today <= start) return 0;
  if (today >= end) return 100;
  return Math.round(((today - start) / (end - start)) * 100);
};
const isOverdue = (task) =>
  task.deadline &&
  new Date(task.deadline) < new Date() &&
  task.status !== "Completed";
const getBadgeClass = (type, value) =>
  !value ? "badge gray" : `badge ${type}-${String(value).toLowerCase().replace(/\s+/g, "-")}`;

/* -------------------- constants -------------------- */
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

/* -------------------- subcomponents -------------------- */
function TaskCard({ task, onClick, hasPending }) {
  const displayTitle = task.task_title ?? task.title ?? "(Untitled)";
  const assignedByDisplay = task.assigned_by_label || task.assigned_by || "-";
  const progress = calcProgress(task);
  const overdue = isOverdue(task);

  // status-* class for CSS
  const statusClass = task.status
    ? `status-${task.status.toLowerCase().replace(/\s+/g, "-")}`
    : "";

  return (
    <div
      className={`card ${statusClass} ${overdue ? "overdueCard" : ""}`}
      onClick={() => onClick(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" ? onClick(task) : null)}
    >
      <div className="cardHeader">
        <div className="cardTitle">
          <strong>{displayTitle}</strong>
        </div>
        {hasPending && <span className="pendingTag">⏳ Pending</span>}
      </div>

      <div className="badgeRow">
        <span className={getBadgeClass("product", task.product)}>{task.product}</span>
        <span className={getBadgeClass("status", task.status)}>{task.status}</span>
        <span className={getBadgeClass("priority", task.priority)}>{task.priority}</span>
      </div>

      <div className="dateRow">
        {task.start_date && <span className="start">⏳ Start: {fmtDateForInput(task.start_date)}</span>}
        {task.deadline && (
          <span className={`deadline ${overdue ? "overdue" : ""}`}>
            ⏰ Deadline: {fmtDateForInput(task.deadline)} {overdue && "⚠️"}
          </span>
        )}
        {task.completion_date && (
          <span className="complete">✅ Completed: {fmtDateForInput(task.completion_date)}</span>
        )}
      </div>

      <p className="assignedBy">👤 Assigned By: {assignedByDisplay}</p>

      <div className="progressBar">
        <div
          className={`progressBarFill ${overdue ? "overdue" : ""}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function TaskTableView({ tasks, onEditClick }) {
  return (
    <div className="taskTableWrapper">
      <table className="taskTable">
        <thead>
          <tr>
            <th>S/N</th>
            <th>Title</th>
            <th>Product</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Task Type</th>
            <th>Start Date</th>
            <th>Deadline</th>
            <th>Completion</th>
            <th>Assigned By</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, idx) => (
            <tr
              key={task.id}
              onClick={() => onEditClick(task)}
              className={`row-${(task.status || "").toLowerCase().replace(/\s+/g, "-")}`}
            >
              <td>{idx + 1}</td>
              <td>{task.task_title ?? task.title ?? "(Untitled)"}</td>
              <td>{task.product || "-"}</td>
              <td>{task.status || "-"}</td>
              <td>{task.priority || "-"}</td>
              <td>{task.task_type || "-"}</td>
              <td>{fmtDateForInput(task.start_date)}</td>
              <td>{fmtDateForInput(task.deadline)}</td>
              <td>{fmtDateForInput(task.completion_date)}</td>
              <td>{task.assigned_by_label || task.assigned_by || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditTaskModal({ form, setForm, onCancel, onSave, task, dropdownOptions }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "completion_date" && value) updated.status = "Completed";
      return updated;
    });
  };

  const datesChanged =
    form.start_date !== fmtDateForInput(task?.start_date) ||
    form.deadline !== fmtDateForInput(task?.deadline);

  return (
    <div className="modalOverlay" onClick={onCancel}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h2>Edit Task</h2>
          <button className="closeX" onClick={onCancel}>×</button>
        </div>

        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <label className="required">Task Title</label>
          <input
            name="task_title"
            value={form.task_title || ""}
            onChange={handleChange}
            required
          />

          <label className="required">Product</label>
          <select
            name="product"
            value={form.product || ""}
            onChange={handleChange}
            required
          >
            <option value="">Select Product</option>
            {dropdownOptions.product.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <label className="required">Status</label>
          <select
            name="status"
            value={form.status || ""}
            onChange={handleChange}
            required
          >
            <option value="">Select Status</option>
            {dropdownOptions.status.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <label className="required">Priority</label>
          <select
            name="priority"
            value={form.priority || ""}
            onChange={handleChange}
            required
          >
            <option value="">Select Priority</option>
            {dropdownOptions.priority.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <label>Assigned By</label>
          <select
            name="assigned_by"
            value={form.assigned_by || ""}
            onChange={handleChange}
          >
            <option value="">Select Assigner</option>
            {dropdownOptions.static_assigned_by.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <label>Task Type</label>
          <select
            name="task_type"
            value={form.task_type || ""}
            onChange={handleChange}
          >
            <option value="">Select Type</option>
            {dropdownOptions.task_type.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <label className="required">Start Date</label>
          <input
            type="date"
            name="start_date"
            value={form.start_date || ""}
            onChange={handleChange}
            required
          />

          <label className="required">Deadline</label>
          <input
            type="date"
            name="deadline"
            value={form.deadline || ""}
            onChange={handleChange}
            required
          />

          {datesChanged && (
            <>
              <label className="required">Why changed the date?</label>
              <input
                name="date_change_reason"
                value={form.date_change_reason || ""}
                onChange={handleChange}
                placeholder="Provide reason for date change"
                required
              />
            </>
          )}

          <label>Completion Date</label>
          <input
            type="date"
            name="completion_date"
            value={form.completion_date || ""}
            onChange={handleChange}
          />

          <label>Remarks</label>
          <input
            name="remarks"
            value={form.remarks || ""}
            onChange={handleChange}
          />

          <label>Linked Folder</label>
          <input
            name="linked_folder"
            value={form.linked_folder || ""}
            onChange={handleChange}
          />

          <div className="buttonRow">
            <button type="submit" className="actionBtn save">✔ Save</button>
            <button type="button" className="actionBtn cancel" onClick={onCancel}>✖ Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------- main component -------------------- */
export default function TaskTable() {
  const [tasks, setTasks] = useState([]);
  const [pendingMap, setPendingMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [form, setForm] = useState({});
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState("member");
  const [viewMode, setViewMode] = useState("card");

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data?.session?.user?.id || null;
      setUserId(uid);

      if (uid) {
        const { data: roleRow } = await supabase
          .from("user_with_role")
          .select("role")
          .eq("id", uid)
          .maybeSingle();
        setUserRole(roleRow?.role || "member");
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!userId) return;
      setLoading(true);
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
        .order("deadline", { ascending: true })
        .order("created_at", { ascending: false });
      setTasks(data || []);
      setLoading(false);
    };
    fetchTasks();
  }, [userId]);

  useEffect(() => {
    const fetchPending = async () => {
      if (!userId) return;
      let query = supabase
        .from("task_date_change_requests")
        .select("task_id,status,requested_by")
        .eq("status", "Pending");

      if (userRole === "member") query = query.eq("requested_by", userId);

      const { data } = await query;
      if (data) {
        const map = {};
        data.forEach((r) => (map[r.task_id] = true));
        setPendingMap(map);
      }
    };
    fetchPending();
  }, [userId, userRole]);

  // 🔒 Lock background scroll when modal is open
  useEffect(() => {
    if (editingTaskId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [editingTaskId]);

  const handleEditClick = (task) => {
    setEditingTaskId(task.id);
    setForm({
      ...task,
      start_date: fmtDateForInput(task.start_date),
      deadline: fmtDateForInput(task.deadline),
      completion_date: fmtDateForInput(task.completion_date),
      task_title: task.task_title ?? task.title ?? "",
      assigned_by: task.assigned_by || task.assigned_by_label || "",
      date_change_reason: ""
    });
  };

  const handleCancel = () => {
    setEditingTaskId(null);
    setForm({});
  };

  const buildUpdatePayload = (f) => {
    let assignedByUUID = null;
    let assignedByLabel = null;
    if (f.assigned_by?.match(/^[0-9a-f-]{8}-/)) assignedByUUID = f.assigned_by;
    else if (f.assigned_by) assignedByLabel = f.assigned_by;

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
    const originalTask = tasks.find((t) => t.id === editingTaskId);
    if (!originalTask) return;

    const updates = buildUpdatePayload(form);

    const origStart = fmtDateForInput(originalTask.start_date);
    const origDeadl = fmtDateForInput(originalTask.deadline);
    const hasDateChange = form.start_date !== origStart || form.deadline !== origDeadl;

    if (hasDateChange && !form.date_change_reason?.trim()) {
      alert('Please provide a reason in "Why changed the date?"');
      return;
    }

    if (hasDateChange && !["team_leader","manager","admin"].includes(userRole)) {
      await supabase.from("task_date_change_requests").insert({
        task_id: editingTaskId,
        old_start_date: originalTask.start_date,
        old_deadline: originalTask.deadline,
        new_start_date: form.start_date,
        new_deadline: form.deadline,
        reason: form.date_change_reason,
        status: "Pending"
      });
      alert("Request submitted for approval.");
      handleCancel();
      return;
    }

    await supabase.from("tasks").update(updates).eq("id", editingTaskId);
    setTasks((prev) => prev.map((t) => (t.id === editingTaskId ? { ...t, ...updates } : t)));
    handleCancel();
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const isDoneA = a.status === "Completed" || a.status === "Cancelled";
      const isDoneB = b.status === "Completed" || b.status === "Cancelled";
      if (isDoneA && !isDoneB) return 1;
      if (!isDoneA && isDoneB) return -1;

      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      if (da !== db) return da - db;

      const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
      const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return cb - ca;
    });
  }, [tasks]);

  if (loading) return <p>Loading tasks...</p>;
  if (!sortedTasks.length) return <p style={{ textAlign: "center" }}>No tasks found</p>;

  const currentTask = tasks.find((t) => t.id === editingTaskId);

  return (
    <div className="taskBoard">
      <div className="viewToggle">
        <button
          className={viewMode === "card" ? "active" : ""}
          onClick={() => setViewMode("card")}
          type="button"
        >
          📇 Card View
        </button>
        <button
          className={viewMode === "table" ? "active" : ""}
          onClick={() => setViewMode("table")}
          type="button"
        >
          📋 Table View
        </button>
      </div>

      {viewMode === "card" ? (
        <div className={`gridWrapper ${editingTaskId ? "blurred" : ""}`}>
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={handleEditClick}
              hasPending={pendingMap[task.id]}
            />
          ))}
        </div>
      ) : (
        <TaskTableView tasks={sortedTasks} onEditClick={handleEditClick} />
      )}

      {editingTaskId && (
        <EditTaskModal
          form={form}
          setForm={setForm}
          onCancel={handleCancel}
          onSave={handleSave}
          task={currentTask}
          dropdownOptions={dropdownOptions}
        />
      )}
    </div>
  );
}
