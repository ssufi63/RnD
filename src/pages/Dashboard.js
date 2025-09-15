import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [role, setRole] = useState("user");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    task_title: "",
    product: "AC",
    status: "Not Started",
    priority: "Medium",
    assigned_by: "Self",
    task_type: "Development",
    start_date: "",
    deadline: "",
    remarks: "",
    linked_folder: ""
  });

  // For editing tasks
  const [editValues, setEditValues] = useState({});

  // ✅ Fetch session and role
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/login");
        return;
      }
      setSession(data.session);

      const { data: profile, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.session.user.id)
        .single();

      if (error) {
        console.warn("No role found in users table, defaulting to 'user'");
        setRole("user");
      } else {
        setRole(profile.role || "user");
      }
    };

    fetchSession();
  }, [navigate]);

  // ✅ Fetch tasks
  useEffect(() => {
    if (!session || !role) return;

    const fetchTasks = async () => {
      setLoading(true);
      let query = supabase.from("tasks").select("*");

      if (role === "user") {
        query = query.eq("assigned_to", session.user.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error(error);
      } else {
        setTasks(data);
      }
      setLoading(false);
    };

    fetchTasks();
  }, [session, role]);

  // ✅ Handle input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ Handle self-task submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Convert empty date strings to null
    const cleanForm = {
      ...form,
      start_date: form.start_date === "" ? null : form.start_date,
      deadline: form.deadline === "" ? null : form.deadline,
      assigned_to: session.user.id,
      assigned_by: "Self"
    };

    const { error } = await supabase.from("tasks").insert([cleanForm]);

    if (error) {
      alert("Error creating task: " + error.message);
    } else {
      alert("Task added successfully!");
      setForm({
        task_title: "",
        product: "AC",
        status: "Not Started",
        priority: "Medium",
        assigned_by: "Self",
        task_type: "Development",
        start_date: "",
        deadline: "",
        remarks: "",
        linked_folder: ""
      });
      window.location.reload();
    }
  };

  // ✅ Handle local edit changes
  const handleEditChange = (taskId, field, value) => {
    setEditValues((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  // ✅ Save updates to Supabase
  const handleSave = async (taskId) => {
    if (!editValues[taskId]) return;

    // Clean dates before updating
    const updates = {
      ...editValues[taskId],
      completion_date:
        editValues[taskId].completion_date === ""
          ? null
          : editValues[taskId].completion_date
    };

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("task_id", taskId);

    if (error) {
      alert("Error updating task: " + error.message);
    } else {
      alert("Task updated successfully!");
      setEditValues((prev) => {
        const newVals = { ...prev };
        delete newVals[taskId];
        return newVals;
      });
      window.location.reload();
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>
        {role === "team_leader"
          ? "Team Leader Dashboard"
          : "User Dashboard (Summary)"}
      </h2>
      <p>Current Role: {role}</p>

      {/* ✅ Task Table */}
      <h3>Your Tasks</h3>
      <table
        border="1"
        cellPadding="5"
        style={{ width: "100%", marginBottom: "20px" }}
      >
        <thead>
          <tr>
            <th>Title</th>
            <th>Product</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assigned By</th>
            <th>Type</th>
            <th>Start</th>
            <th>Deadline</th>
            <th>Completion</th>
            <th>Remarks</th>
            <th>Linked Folder</th>
            {Object.keys(editValues).length > 0 && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan="12">No tasks found</td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.task_id}>
                <td>{task.task_title}</td>
                <td>{task.product}</td>
                <td>{task.status}</td>
                <td>{task.priority}</td>
                <td>{task.assigned_by}</td>
                <td>{task.task_type}</td>
                <td>{task.start_date || "-"}</td>
                <td>{task.deadline || "-"}</td>
                <td>
                  {task.assigned_to === session.user.id ? (
                    <input
                      type="date"
                      defaultValue={task.completion_date || ""}
                      min={task.start_date}
                      onChange={(e) =>
                        handleEditChange(
                          task.task_id,
                          "completion_date",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    task.completion_date || "-"
                  )}
                </td>
                <td>
                  {task.assigned_to === session.user.id ? (
                    <input
                      type="text"
                      defaultValue={task.remarks || ""}
                      placeholder="Add remarks"
                      onChange={(e) =>
                        handleEditChange(
                          task.task_id,
                          "remarks",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    task.remarks || "-"
                  )}
                </td>
                <td>
                  {task.assigned_to === session.user.id ? (
                    <input
                      type="text"
                      defaultValue={task.linked_folder || ""}
                      placeholder="Folder URL"
                      onChange={(e) =>
                        handleEditChange(
                          task.task_id,
                          "linked_folder",
                          e.target.value
                        )
                      }
                    />
                  ) : task.linked_folder ? (
                    <a
                      href={task.linked_folder}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
  {task.assigned_to === session.user.id && editValues[task.task_id] && (
    <button onClick={() => handleSave(task.task_id)}>Save</button>
  )}
</td>

              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ✅ Self-task Form */}
      {role === "user" && (
        <div>
          <h3>Add Self-Task</h3>
          <form onSubmit={handleSubmit}>
            <input
              name="task_title"
              placeholder="Task Title"
              value={form.task_title}
              onChange={handleChange}
              required
            />
            <select
              name="product"
              value={form.product}
              onChange={handleChange}
            >
              <option>AC</option>
              <option>REF</option>
              <option>MWO</option>
              <option>WP</option>
              <option>CC</option>
            </select>
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Not Started</option>
              <option>In Progress</option>
              <option>On Hold</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
              <option>Urgent</option>
            </select>
            <select
              name="task_type"
              value={form.task_type}
              onChange={handleChange}
            >
              <option>Development</option>
              <option>Prototyping</option>
              <option>Testing</option>
              <option>Documentation</option>
              <option>Analysis</option>
              <option>Experimentation</option>
              <option>Design</option>
              <option>Cost Optimization</option>
              <option>Innovation</option>
              <option>New Model</option>
            </select>
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
            />
            <input
              type="date"
              name="deadline"
              value={form.deadline}
              onChange={handleChange}
            />
            <input
              name="remarks"
              placeholder="Remarks"
              value={form.remarks}
              onChange={handleChange}
            />
          {/*   <input
              name="linked_folder"
              placeholder="Linked Folder URL"
              value={form.linked_folder}
              onChange={handleChange}
            /> */}
            <button type="submit">Add Task</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
