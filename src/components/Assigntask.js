// src/components/AssignTask.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

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

  const dropdownOptions = {
    product: ["AC", "REF", "MWO", "WP", "CC"],
    status: ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"],
    priority: ["High", "Medium", "Low", "Urgent"],
    task_type: [
      "Development", "Prototyping", "Testing", "Documentation", "Analysis",
      "Experimentation", "Design", "Cost Optimization", "Innovation", "New Model"
    ],
  };

  // Load users for "Assigned To" dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, department, role")
        .neq("role", "admin"); // optional: exclude admins
      if (error) console.error("Error loading users:", error);
      else setUsers(data || []);
    };
    fetchUsers();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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

    // Get current logged-in leader
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      alert("Could not fetch logged-in user");
      setLoading(false);
      return;
    }
    const leaderId = userData.user.id;

    // Insert task
    const { error } = await supabase.from("tasks").insert([
      {
        task_title: form.task_title,
        product: form.product,
        status: form.status,
        priority: form.priority,
        task_type: form.task_type,
        assigned_to: form.assigned_to,
        assigned_by: leaderId, // auto-filled
        start_date: form.start_date || null,
        deadline: form.deadline || null,
        remarks: form.remarks,
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
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        {/* Task Title full width */}
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
            <select name="product" value={form.product} onChange={handleChange} style={styles.select}>
              <option value="">Select Product</option>
              {dropdownOptions.product.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Status</label>
            <select name="status" value={form.status} onChange={handleChange} style={styles.select}>
              <option value="">Select Status</option>
              {dropdownOptions.status.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Priority</label>
            <select name="priority" value={form.priority} onChange={handleChange} style={styles.select}>
              <option value="">Select Priority</option>
              {dropdownOptions.priority.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Assigned To / Task type / Start / Deadline */}
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Assigned To</label>
            <select name="assigned_to" value={form.assigned_to} onChange={handleChange} style={styles.select} required>
              <option value="">Select User</option>
            {users.map((u) => (
  <option key={u.id} value={u.id}>
    {u.full_name} {u.department ? `(${u.department})` : ""}
  </option>
))}

            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Task Type</label>
            <select name="task_type" value={form.task_type} onChange={handleChange} style={styles.select}>
              <option value="">Select Type</option>
              {dropdownOptions.task_type.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={styles.dateField}>
            <label style={styles.label}>Start Date</label>
            <input type="date" name="start_date" value={form.start_date} onChange={handleChange} style={styles.input} />
          </div>
          <div style={styles.dateField}>
            <label style={styles.label}>Deadline</label>
            <input type="date" name="deadline" value={form.deadline} onChange={handleChange} style={styles.input} />
          </div>
        </div>

        {/* Remarks full width */}
        <div style={styles.row}>
          <div style={{ ...styles.field, flex: "1 1 100%" }}>
            <label style={styles.label}>Remarks</label>
            <input
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              style={styles.input}
              placeholder="Optional remarks"
            />
          </div>
        </div>

        <button type="submit" style={styles.submitButton} disabled={loading}>
          {loading ? "Assigning..." : "Assign Task"}
        </button>
      </form>
    </div>
  );
}

// Styles (copied from TaskForm.js for consistency)
const styles = {
  container: {
    maxWidth: 900,
    margin: "40px auto",
    padding: 28,
    borderRadius: 14,
    background: "#fff",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  },
  form: { display: "flex", flexDirection: "column", gap: 24 },
  fullRow: { width: "100%", display: "flex", flexDirection: "column" },
  row: { display: "flex", flexWrap: "wrap", gap: 20 },
  field: { flex: "1 1 220px", display: "flex", flexDirection: "column" },
  dateField: { flex: "1 1 180px", display: "flex", flexDirection: "column" },
  label: { fontWeight: 600, fontSize: 15, color: "#0d6efd", marginBottom: 6 },
  input: { height: 44, padding: "8px 12px", fontSize: 15, borderRadius: 8, border: "1px solid #ccc", outline: "none" },
  inputFull: { height: 50, padding: "10px 14px", fontSize: 16, borderRadius: 8, border: "1px solid #ccc" },
  select: { height: 44, padding: "8px 12px", fontSize: 15, borderRadius: 8, border: "1px solid #ccc", appearance: "none" },
  submitButton: {
    padding: "12px 20px",
    background: "linear-gradient(135deg,#007bff,#00c6ff)",
    color: "#fff",
    borderRadius: 10,
    border: "none",
    fontWeight: 600,
  },
};
