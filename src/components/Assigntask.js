import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./Assigntask.css";

export default function AssignTask() {
  const [form, setForm] = useState({
    task_title: "",
    product: "",
    status: "",
    priority: "",
    task_type: "",
    assigned_to: "",
    start_date: "",
    deadline: "",
    remarks: "",
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showWorkload, setShowWorkload] = useState(false);
  const [workloadSummary, setWorkloadSummary] = useState(null);
  const [workloadTasks, setWorkloadTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const dropdownOptions = {
    product: ["AC", "REF", "MWO", "WP", "CC"],
    status: ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"],
    priority: ["High", "Medium", "Low", "Urgent"],
    task_type: [
      "Development",
      "Prototyping",
      "Testing",
      "Documentation",
      "Analysis",
      "Experimentation",
      "Design",
      "Cost Optimization",
      "Innovation",
      "New Model",
    ],
  };

  // 🔹 Load all users except logged-in
  useEffect(() => {
    const fetchUsers = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) return;

      const loggedInUserId = userData.user.id;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, department")
        .neq("id", loggedInUserId);

      if (!error) setUsers(data || []);
    };

    fetchUsers();
  }, []);

  // 🔹 Fetch workload summary
  const fetchWorkloadSummary = async (userId) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("id, task_title, status, priority, deadline, remarks")
      .eq("assigned_to", userId)
      .neq("status", "Completed");

    if (error) return;

    setWorkloadTasks(data || []);

    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(now.getDate() + 7);

    const dueThisWeek = data.filter(
      (t) => t.deadline && new Date(t.deadline) <= weekAhead
    ).length;

    const inProgress = data.filter((t) => t.status === "In Progress").length;

    const priorityCount = data.reduce((acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    }, {});

    setWorkloadSummary({
      total: data.length,
      dueThisWeek,
      inProgress,
      priorityCount,
    });
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // 🔹 Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.task_title || !form.assigned_to) {
      alert("Task title and assigned user are required.");
      return;
    }
    if (form.start_date && form.deadline && form.deadline < form.start_date) {
      alert("Deadline cannot be before Start Date");
      return;
    }

    setLoading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      alert("Could not fetch logged-in user");
      setLoading(false);
      return;
    }
    const leaderId = userData.user.id;

    const { error } = await supabase.from("tasks").insert([
      {
        ...form,
        assigned_by: leaderId,
        start_date: form.start_date || null,
        deadline: form.deadline || null,
      },
    ]);

    setLoading(false);

    if (error) {
      alert("Error assigning task: " + error.message);
    } else {
      alert("Task assigned successfully ✅");
      setForm({
        task_title: "",
        product: "",
        status: "",
        priority: "",
        task_type: "",
        assigned_to: "",
        start_date: "",
        deadline: "",
        remarks: "",
      });
    }
  };

  return (
    <div className="assign-task-layout">
      {/* Left = Form */}
      <div
        className={`assign-task-form-container ${
          showWorkload ? "with-summary" : ""
        }`}
      >
        <form className="assign-task-form" onSubmit={handleSubmit}>
          {/* Task Title */}
          <div>
            <label className="assign-task-label">Task Title</label>
            <input
              name="task_title"
              value={form.task_title}
              onChange={handleChange}
              className="assign-task-input-full"
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Product / Status / Priority */}
          <div className="assign-task-row">
            <div className="assign-task-field">
              <label className="assign-task-label">Product</label>
              <select
                name="product"
                value={form.product}
                onChange={handleChange}
                className="assign-task-select"
              >
                <option value="">Select Product</option>
                {dropdownOptions.product.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="assign-task-field">
              <label className="assign-task-label">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="assign-task-select"
              >
                <option value="">Select Status</option>
                {dropdownOptions.status.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="assign-task-field">
              <label className="assign-task-label">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="assign-task-select"
              >
                <option value="">Select Priority</option>
                {dropdownOptions.priority.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned To / Task type / Start / Deadline */}
          <div className="assign-task-row">
            <div className="assign-task-field">
              <label className="assign-task-label">Assigned To</label>
              <select
                name="assigned_to"
                value={form.assigned_to}
                onChange={(e) => {
                  handleChange(e);
                  fetchWorkloadSummary(e.target.value);
                  setShowWorkload(true);
                }}
                className="assign-task-select"
                required
              >
                <option value="">Select User</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} {u.department ? `(${u.department})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="assign-task-field">
              <label className="assign-task-label">Task Type</label>
              <select
                name="task_type"
                value={form.task_type}
                onChange={handleChange}
                className="assign-task-select"
              >
                <option value="">Select Type</option>
                {dropdownOptions.task_type.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="assign-task-date">
              <label className="assign-task-label">Start Date</label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                className="assign-task-input"
              />
            </div>
            <div className="assign-task-date">
              <label className="assign-task-label">Deadline</label>
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                className="assign-task-input"
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="assign-task-row">
            <div className="assign-task-field" style={{ flex: "1 1 100%" }}>
              <label className="assign-task-label">Remarks</label>
              <input
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                className="assign-task-input"
                placeholder="Optional remarks"
              />
            </div>
          </div>

          <button type="submit" className="assign-task-button" disabled={loading}>
            {loading ? "Assigning..." : "Assign Task"}
          </button>
        </form>
      </div>

      {/* Right = Workload Summary */}
      <div
        className={`workload-summary-panel ${
          showWorkload ? "slide-in" : "slide-out"
        }`}
      >
        {workloadSummary && (
          <div className="workload-summary-content">
            <div className="summary-header">
              <h3>Workload Summary</h3>
              <button className="summary-close" onClick={() => setShowWorkload(false)}>
                ✕
              </button>
            </div>

            <div className="summary-cards">
              <div className="summary-card">
                <span>Total Active</span>
                <strong>{workloadSummary.total}</strong>
              </div>
              <div className="summary-card">
                <span>Due This Week</span>
                <strong>{workloadSummary.dueThisWeek}</strong>
              </div>
              <div className="summary-card">
                <span>In Progress</span>
                <strong>{workloadSummary.inProgress}</strong>
              </div>
            </div>

            <h4>By Priority</h4>
            <div className="priority-tags">
              {Object.entries(workloadSummary.priorityCount).map(
                ([priority, count]) => (
                  <span
                    key={priority}
                    className={`priority-tag ${priority.toLowerCase()}`}
                  >
                    {priority}: {count}
                  </span>
                )
              )}
            </div>

            <h4>In Progress Tasks</h4>
            <div className="task-card-container">
              {workloadTasks
                .filter((t) => t.status === "In Progress")
                .map((task) => (
                  <div
                    key={task.id}
                    className="task-card"
                    onClick={() => setSelectedTask(task)}
                  >
                    <h5>{task.task_title}</h5>
                    <p>Priority: {task.priority}</p>
                    <p>Deadline: {task.deadline || "No deadline"}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Slide-in Task Drawer */}
      {selectedTask && (
        <div className="task-drawer">
          <div className="task-drawer-content">
            <div className="drawer-header">
              <h2>{selectedTask.task_title}</h2>
              <button className="drawer-close" onClick={() => setSelectedTask(null)}>
                ✕
              </button>
            </div>

            <div className="drawer-section">
              <span className="drawer-label">Status</span>
              <span
                className={`drawer-badge status-${selectedTask.status
                  .replace(" ", "")
                  .toLowerCase()}`}
              >
                {selectedTask.status}
              </span>
            </div>

            <div className="drawer-section">
              <span className="drawer-label">Priority</span>
              <span
                className={`drawer-badge priority-${selectedTask.priority.toLowerCase()}`}
              >
                {selectedTask.priority}
              </span>
            </div>

            <div className="drawer-section">
              <span className="drawer-label">Deadline</span>
              <span className="drawer-value">
                {selectedTask.deadline || "No deadline"}
              </span>
            </div>

            <div className="drawer-section">
              <span className="drawer-label">Remarks</span>
              <span className="drawer-value">{selectedTask.remarks || "None"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
