import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import toast from "react-hot-toast";
import "./TaskDetailModal.css";

export default function TaskDetailModal({ task, onClose }) {
  const [assignedUser, setAssignedUser] = useState(null);
  const [creator, setCreator] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState("");
  const [systemLogs, setSystemLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");

  // ✅ Fetch current user + role
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setUser(userData.user);
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userData.user.id)
          .single();
        setRole(data?.role || "user");
      }
    })();
  }, []);

  // ✅ Fetch related data
  useEffect(() => {
    const fetchProfilesAndRemarks = async () => {
      if (task?.assigned_to) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", task.assigned_to)
          .single();
        setAssignedUser(data);
      }

      if (task?.created_by) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", task.created_by)
          .single();
        setCreator(data);
      }

      // 🔹 Fetch remarks
      const { data: remarkData } = await supabase
        .from("task_remarks")
        .select(
          "id, remark, type, created_at, user_id, profiles(full_name)"
        )
        .eq("task_id", task.id)
        .order("created_at", { ascending: false });
      setRemarks(remarkData || []);

      // 🔹 Fetch system logs (stored as system remarks)
      const { data: sysLogs } = await supabase
        .from("task_remarks")
        .select(
          "id, remark, created_at, type"
        )
        .eq("task_id", task.id)
        .eq("type", "system")
        .order("created_at", { ascending: false });
      setSystemLogs(sysLogs || []);
    };

    fetchProfilesAndRemarks();

    const ch = supabase
      .channel(`realtime-task-${task.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_remarks", filter: `task_id=eq.${task.id}` },
        (payload) => {
          if (payload.new) {
            setRemarks((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [task]);

  // ✅ Handle adding a new remark
  const handleAddRemark = async (e) => {
    e.preventDefault();
    if (!newRemark.trim()) return;
    try {
      const { error } = await supabase.from("task_remarks").insert([
        {
          task_id: task.id,
          user_id: user?.id || null,
          remark: newRemark.trim(),
          type: "manual",
        },
      ]);
      if (error) throw error;
      setNewRemark("");
      toast.success("Remark added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add remark");
    }
  };

  // ✅ Handle task editing (basic inline example)
  const handleEditTask = async () => {
    if (!editing) return setEditing(true);
    try {
      const { error } = await supabase
        .from("kanban_tasks")
        .update({ description: task.description })
        .eq("id", task.id);
      if (error) throw error;
      toast.success("Task updated");
      setEditing(false);
    } catch (err) {
      toast.error("Failed to update task");
    }
  };

  if (!task) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // prevent backdrop click
      >
        <div className="modal-header">
          <h2>{task.title}</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="task-detail">
            <strong>Description:</strong>{" "}
            {editing ? (
              <textarea
                value={task.description || ""}
                onChange={(e) => (task.description = e.target.value)}
                className="modal-textarea"
              />
            ) : (
              task.description || "—"
            )}
          </p>

          {assignedUser && (
            <p className="task-detail">
              <strong>Assigned To:</strong> {assignedUser.full_name} (
              {assignedUser.email})
            </p>
          )}
          {creator && (
            <p className="task-detail">
              <strong>Created By:</strong> {creator.full_name} ({creator.email})
            </p>
          )}
          {task.start_date && (
            <p className="task-detail">
              <strong>Start Date:</strong>{" "}
              {new Date(task.start_date).toLocaleDateString()}
            </p>
          )}
          {task.deadline && (
            <p className="task-detail">
              <strong>Deadline:</strong>{" "}
              {new Date(task.deadline).toLocaleDateString()}
            </p>
          )}
          {task.status && (
            <p className="task-detail">
              <strong>Status:</strong> {task.status}
            </p>
          )}
          {task.priority_id && (
            <p className="task-detail">
              <strong>Priority:</strong> {task.priority_id}
            </p>
          )}
          <p className="task-detail small">
            <strong>Created:</strong>{" "}
            {new Date(task.created_at).toLocaleString()}
          </p>
          <p className="task-detail small">
            <strong>Updated:</strong>{" "}
            {new Date(task.updated_at).toLocaleString()}
          </p>
        </div>

        {/* 🟩 Step 3 - Action Buttons */}
        <div className="modal-actions">
          {["admin", "manager", "team_leader"].includes(role) && (
            <button className="btn-blue" onClick={handleEditTask}>
              {editing ? "Save" : "Edit"}
            </button>
          )}
          <button
            className="btn-gray"
            onClick={() => setShowLogs((s) => !s)}
          >
            {showLogs ? "Hide History" : "View History"}
          </button>
        </div>

        {/* 🟦 Add Remark Section */}
        <form onSubmit={handleAddRemark} className="remark-form">
          <textarea
            value={newRemark}
            onChange={(e) => setNewRemark(e.target.value)}
            placeholder="Add a remark..."
            className="remark-input"
          />
          <button className="btn-blue" disabled={!newRemark.trim()}>
            Add Remark
          </button>
        </form>

        {/* 🟨 Display Remarks */}
        <div className="remarks-section">
          <h4>Remarks</h4>
          {remarks.length === 0 ? (
            <p className="empty-text">No remarks yet.</p>
          ) : (
            remarks.map((r) => (
              <div key={r.id} className="remark-item">
                <strong>{r.profiles?.full_name || "Unknown"}:</strong>{" "}
                {r.remark}
                <div className="remark-time">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 🟥 System Logs */}
        {showLogs && (
          <div className="logs-section">
            <h4>System Logs</h4>
            {systemLogs.length === 0 ? (
              <p className="empty-text">No logs yet.</p>
            ) : (
              systemLogs.map((l) => (
                <div key={l.id} className="log-item">
                  <span>{l.remark}</span>
                  <span className="remark-time">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
