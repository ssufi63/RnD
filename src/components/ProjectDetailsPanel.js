import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import { FaClipboardList, FaUsers, FaCommentDots } from "react-icons/fa";
import "./ProjectDetailsPanel.css";
import TaskDetailModal from "./modals/TaskDetailModal";

export default function ProjectDetailsPanel({ project }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null); // 👈 added

  useEffect(() => {
    if (!project?.project_id) return;
    fetchTasks();
    fetchMembers();
    fetchRemarks();

    const ch = supabase
      .channel(`rt-project-remarks-${project.project_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_remarks",
          filter: `project_id=eq.${project.project_id}`,
        },
        fetchRemarks
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [project?.project_id]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("kanban_tasks")
      .select("*")
      .eq("project_id", project.project_id)
      .order("created_at", { ascending: true });
    if (error) toast.error("Failed to load tasks");
    else setTasks(data || []);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("project_members")
      .select("user_id, profiles(full_name, email)")
      .eq("project_id", project.project_id);
    if (error) toast.error("Failed to load members");
    else setMembers(data || []);
  };

  const fetchRemarks = async () => {
    const { data, error } = await supabase
      .from("project_remarks")
      .select(
        "id, remark, created_at, created_by, profiles!project_remarks_created_by_fkey(full_name)"
      )
      .eq("project_id", project.project_id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load remarks");
    else setRemarks(data || []);
  };

  return (
    <div className="project-details-wrapper">
      <h2 className="project-title">
        {project.name} <span className="muted">— Details</span>
      </h2>

      {/* TASKS */}
      <section className="details-section">
        <div className="section-header">
          <FaClipboardList className="section-icon task-icon" />
          <h3>Tasks</h3>
        </div>
        {tasks.length === 0 ? (
          <p className="empty-text">No tasks yet.</p>
        ) : (
          <div className="task-grid">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="task-card hoverable"
                onClick={() => setSelectedTask(t)} // 👈 open modal
              >
                <h4 className="task-title">{t.title}</h4>
                {t.description && (
                  <p className="task-desc">{t.description}</p>
                )}
                {t.deadline && (
                  <p className="task-deadline">
                    🕒 {new Date(t.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MEMBERS */}
      <section className="details-section">
        <div className="section-header">
          <FaUsers className="section-icon member-icon" />
          <h3>Members</h3>
        </div>
        {members.length === 0 ? (
          <p className="empty-text">No members added yet.</p>
        ) : (
          <div className="member-grid">
            {members.map((m) => {
              const initials =
                m.profiles?.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "?";
              return (
                <div key={m.user_id} className="member-card">
                  <div className="avatar">{initials}</div>
                  <div>
                    <p className="member-name">
                      {m.profiles?.full_name || "Unknown"}
                    </p>
                    <p className="member-email">{m.profiles?.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* REMARKS */}
      <section className="details-section">
        <div className="section-header">
          <FaCommentDots className="section-icon remark-icon" />
          <h3>Recent Remarks</h3>
        </div>
        {remarks.length === 0 ? (
          <p className="empty-text">No remarks yet.</p>
        ) : (
          <div className="remarks-list">
            {remarks.slice(0, 10).map((r) => (
              <div key={r.id} className="remark-card">
                <p className="remark-text">
                  <strong>{r.profiles?.full_name || "Unknown"}:</strong>{" "}
                  {r.remark}
                </p>
                <p className="remark-time">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
