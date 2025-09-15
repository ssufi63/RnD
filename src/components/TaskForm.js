// src/components/TaskForm.js
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function TaskForm({ onTaskCreated }) {
  const [form, setForm] = useState({
    task_title: "",
    product: "",
    status: "",
    priority: "",
    assigned_by: "",       // stores UUID or text
    assigned_by_label: "", // for free-text roles
    task_type: "",
    start_date: "",
    deadline: "",
    remarks: ""
  });

  const [leaders, setLeaders] = useState([]);  // fetched from profiles
  const [loading, setLoading] = useState(false);

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

  // 🔹 Fetch leaders (UUIDs) from profiles
  useEffect(() => {
    const fetchLeaders = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["leader", "manager"]); // adjust based on your roles

      if (!error && data) setLeaders(data);
    };
    fetchLeaders();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // 🔹 Insert with UUID OR text fallback
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.task_title || !form.product || !form.status || !form.priority || !form.assigned_by) {
      alert("Please fill required fields");
      return;
    }

    if (form.start_date && form.deadline && form.deadline < form.start_date) {
      alert("Deadline cannot be before Start Date");
      return;
    }

    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id ?? null;

    let assignedByUUID = null;
    let assignedByLabel = null;

    if (form.assigned_by.match(/^[0-9a-f-]{8}-/)) {
      assignedByUUID = form.assigned_by;   // UUID from profiles
    } else {
      assignedByLabel = form.assigned_by;  // free-text role
    }

    const newTask = {
      task_title: form.task_title,
      product: form.product,
      status: form.status,
      priority: form.priority,
      task_type: form.task_type,
      remarks: form.remarks,
      start_date: form.start_date || null,
      deadline: form.deadline || null,
      created_by: userId,
      assigned_to: userId,        // self-task
      assigned_by: assignedByUUID,
      assigned_by_label: assignedByLabel
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert([newTask])
      .select()
      .single();

    setLoading(false);

    if (error) {
      alert("Error creating task: " + error.message);
      return;
    }

    if (onTaskCreated) onTaskCreated(data);

    // reset
    setForm({
      task_title: "",
      product: "",
      status: "",
      priority: "",
      assigned_by: "",
      assigned_by_label: "",
      task_type: "",
      start_date: "",
      deadline: "",
      remarks: ""
    });
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        {/* Task Title */}
        <div style={styles.fullRow}>
          <label style={styles.label}>Task Title</label>
          <input
            name="task_title"
            value={form.task_title}
            onChange={handleChange}
            style={styles.inputFull}
            placeholder="Enter task title"
            required
          />
        </div>

        {/* Product / Status / Priority */}
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Product</label>
            <select
              name="product"
              value={form.product}
              onChange={handleChange}
              style={styles.baseField}
              required
            >
              <option value="">Select Product</option>
              {dropdownOptions.product.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              style={styles.baseField}
              required
            >
              <option value="">Select Status</option>
              {dropdownOptions.status.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              style={styles.baseField}
              required
            >
              <option value="">Select Priority</option>
              {dropdownOptions.priority.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Assigned By / Task type / Dates */}
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Assigned By</label>
            <select
              name="assigned_by"
              value={form.assigned_by}
              onChange={handleChange}
              style={styles.baseField}
              required
            >
              <option value="">Select Assigner</option>
              {leaders.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.full_name} ({leader.role})
                </option>
              ))}
              {dropdownOptions.static_assigned_by.map((txt) => (
                <option key={txt} value={txt}>
                  {txt}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Task Type</label>
            <select
              name="task_type"
              value={form.task_type}
              onChange={handleChange}
              style={styles.baseField}
            >
              <option value="">Select Type</option>
              {dropdownOptions.task_type.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={styles.dateField}>
            <label style={styles.label}>Start Date</label>
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              style={styles.dateFieldInput}
            />
          </div>

          <div style={styles.dateField}>
            <label style={styles.label}>Deadline</label>
            <input
              type="date"
              name="deadline"
              value={form.deadline}
              onChange={handleChange}
              style={styles.dateFieldInput}
            />
          </div>
        </div>

        {/* Remarks */}
        <div style={styles.fullRow}>
          <label style={styles.label}>Remarks</label>
          <input
            name="remarks"
            value={form.remarks}
            onChange={handleChange}
            style={styles.baseField}
            placeholder="Optional remarks"
          />
        </div>

        <button type="submit" style={styles.submitButton} disabled={loading}>
          {loading ? "Creating..." : "Create Task"}
        </button>
      </form>
    </div>
  );
}

// 🎨 Styles
const styles = {
  container: { maxWidth: 900, margin: "40px auto", padding: 28, borderRadius: 14, background: "#fff", boxShadow: "0 8px 20px rgba(0,0,0,0.08)" },
  form: { display: "flex", flexDirection: "column", gap: 24 },
  fullRow: { width: "100%", display: "flex", flexDirection: "column" },
  row: { display: "flex", flexWrap: "wrap", gap: 20 },
  field: { flex: "1 1 220px", display: "flex", flexDirection: "column" },
  dateField: { flex: "1 1 180px", display: "flex", flexDirection: "column" },
  label: { fontWeight: 600, fontSize: 15, color: "#0d6efd", marginBottom: 6 },

  // 🔹 Unified style for text + select
  baseField: {
    minHeight: "44px",
    padding: "8px 12px",
    fontSize: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
  },

  // 🔹 Special for date picker (keeps full click area)
  dateFieldInput: {
    minHeight: "44px",
    fontSize: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
    appearance: "auto",
    WebkitAppearance: "auto",
    MozAppearance: "auto",
    padding: "0 12px",
  },

  // Taller input only for Task Title
  inputFull: {
    height: 50,
    padding: "10px 14px",
    fontSize: 16,
    borderRadius: 8,
    border: "1px solid #ccc"
  },

  submitButton: {
    padding: "12px 20px",
    background: "linear-gradient(135deg,#007bff,#00c6ff)",
    color: "#fff",
    borderRadius: 10,
    border: "none",
    fontWeight: 600,
    cursor: "pointer"
  }
};
