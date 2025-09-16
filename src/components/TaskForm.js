// src/components/TaskForm.js
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./TaskForm.css"; // ✅ external CSS

export default function TaskForm({ onTaskCreated }) {
  const [form, setForm] = useState({
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

  const [leaders, setLeaders] = useState([]);
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

  useEffect(() => {
    const fetchLeaders = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["leader", "manager"]);

      if (!error && data) setLeaders(data);
    };
    fetchLeaders();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.task_title || !form.product || !form.status || !form.priority || !form.assigned_by) {
      return alert("⚠️ Please fill all required fields");
    }

    if (form.start_date && form.deadline && form.deadline < form.start_date) {
      return alert("⚠️ Deadline cannot be before Start Date");
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id ?? null;

      let assignedByUUID = null;
      let assignedByLabel = null;

      if (form.assigned_by.match(/^[0-9a-f-]{8}-/)) {
        assignedByUUID = form.assigned_by;
      } else {
        assignedByLabel = form.assigned_by;
      }

      const newTask = {
        ...form,
        start_date: form.start_date || null,
        deadline: form.deadline || null,
        created_by: userId,
        assigned_to: userId, // self-task
        assigned_by: assignedByUUID,
        assigned_by_label: assignedByLabel
      };

      const { data, error } = await supabase
        .from("tasks")
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;

      if (onTaskCreated) onTaskCreated(data);

      alert("✅ Task created successfully!");
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
    } catch (err) {
      alert("❌ Error creating task: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="taskForm-container">
      <form className="taskForm" onSubmit={handleSubmit}>
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

        {/* Assigned By / Task Type / Dates */}
        <div className="formRow">
          <div>
            <label>Assigned By</label>
            <select name="assigned_by" value={form.assigned_by} onChange={handleChange} required>
              <option value="">Select Assigner</option>
              {leaders.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.full_name} ({leader.role})
                </option>
              ))}
              {dropdownOptions.static_assigned_by.map((txt) => (
                <option key={txt} value={txt}>{txt}</option>
              ))}
            </select>
          </div>

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

        {/* Remarks */}
        <div className="formRow full">
          <label>Remarks</label>
          <input
            name="remarks"
            value={form.remarks}
            onChange={handleChange}
            placeholder="Optional remarks"
          />
        </div>

        <button type="submit" className="submitBtn" disabled={loading}>
          {loading ? "Creating..." : "Create Task"}
        </button>
      </form>
    </div>
  );
}
