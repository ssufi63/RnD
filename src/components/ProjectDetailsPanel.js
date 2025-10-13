import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  FaClipboardList,
  FaUsers,
  FaCommentDots,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import "./ProjectDetailsPanel.css";
import TaskFormModal from "./modals/TaskFormModal";
import AddMemberModal from "./modals/AddMemberModal";
import ProjectFormModal from "./modals/ProjectFormModal"
import ProjectFormEdit from "./modals/ProjectFormEdit";
import TaskDetailModal from "./modals/TaskDetailModal"; // used for editing

export default function ProjectDetailsPanel({ project }) {
  const [user, setUser] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);

  // remarks
  const [projectRemarks, setProjectRemarks] = useState([]);
  const [selectedTaskRemarks, setSelectedTaskRemarks] = useState([]);
  const [lastRemarkByTask, setLastRemarkByTask] = useState({}); // {task_id: {remark, profiles, created_at}}

  // UI state
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);

  // inline controls per expanded task
  const [showAssigneePickerFor, setShowAssigneePickerFor] = useState(null);
  const [showRemarkInputFor, setShowRemarkInputFor] = useState(null);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [remarkDraftByTask, setRemarkDraftByTask] = useState({}); // {task_id: "text"}

  // Edit modal (reuse TaskDetailModal for editing; it contains its own UI)
  const [editTask, setEditTask] = useState(null);

  // ---------- AUTH ----------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    })();
  }, []);

  // ---------- FETCH BASE DATA ----------
  useEffect(() => {
    if (!project?.project_id) return;
    fetchTasks();
    fetchMembers();
    fetchProjectRemarks();

    // realtime refresh on tasks / project remarks
    const ch = supabase
      .channel(`rt-details-${project.project_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kanban_tasks", filter: `project_id=eq.${project.project_id}` },
        fetchTasks
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_remarks", filter: `project_id=eq.${project.project_id}` },
        fetchProjectRemarks
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [project?.project_id]);

  // fetch tasks for this project
  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("kanban_tasks")
      .select("*")
      .eq("project_id", project.project_id);

    if (error) {
      toast.error("Failed to load tasks");
      setTasks([]);
      return;
    }

    // sort by closest deadline first; nulls go last
    const sorted = [...(data || [])].sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      if (da !== db) return da - db;
      // tie-breaker by created_at
      const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
      const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ca - cb;
    });

    setTasks(sorted);

    // update last remark map for card preview
    if (sorted.length) {
      await fetchLatestRemarksForTasks(sorted.map((t) => t.id));
    }
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("project_members")
      .select("user_id, profiles(full_name, email)")
      .eq("project_id", project.project_id);

    if (error) {
      toast.error("Failed to load members");
      setMembers([]);
      return;
    }
    setMembers(data || []);
  };

  const fetchProjectRemarks = async () => {
    const { data, error } = await supabase
      .from("project_remarks")
      .select("id, remark, created_at, profiles!project_remarks_created_by_fkey(full_name)")
      .eq("project_id", project.project_id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load project remarks");
      setProjectRemarks([]);
      return;
    }
    setProjectRemarks(data || []);
  };

  // fetch latest remark per task for preview on cards
  const fetchLatestRemarksForTasks = async (taskIds) => {
    if (!taskIds?.length) {
      setLastRemarkByTask({});
      return;
    }

    const { data, error } = await supabase
      .from("task_remarks")
      .select("task_id, remark, created_at, profiles(full_name)")
      .in("task_id", taskIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      setLastRemarkByTask({});
      return;
    }

    // pick first occurrence per task_id (since ordered desc)
    const map = {};
    (data || []).forEach((r) => {
      if (!map[r.task_id]) map[r.task_id] = r;
    });
    setLastRemarkByTask(map);
  };

  // when a task is selected, load its remarks (left bottom panel)
// select task + collapse previous expanded
const selectTask = async (taskId) => {
  // collapse previously expanded task when selecting a new one
  setExpandedTaskId(null);

  setSelectedTaskId(taskId);
  if (!taskId) {
    setSelectedTaskRemarks([]);
    return;
  }

  await fetchRemarksForTask(taskId);

  const chName = `rt-task-remarks-${taskId}`;
  const ch = supabase
    .channel(chName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "task_remarks", filter: `task_id=eq.${taskId}` },
      () => fetchRemarksForTask(taskId)
    )
    .subscribe();

  return () => supabase.removeChannel(ch);
};


  const fetchRemarksForTask = async (taskId) => {
    const { data, error } = await supabase
      .from("task_remarks")
      .select("id, remark, created_at, user_id, profiles(full_name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      setSelectedTaskRemarks([]);
      return;
    }
    setSelectedTaskRemarks(data || []);

    // also refresh the preview map for that task
    if (data && data.length) {
      setLastRemarkByTask((prev) => ({
        ...prev,
        [taskId]: data[0],
      }));
    }
  };

  // expanded row toggle
const toggleExpand = (taskId) => {
  setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
};

  // Add a remark inline (from expanded row)
  const addRemark = async (taskId) => {
    const text = remarkDraftByTask[taskId]?.trim();
    if (!text) return toast.error("Remark cannot be empty");

    const { error } = await supabase.from("task_remarks").insert([
      {
        task_id: taskId,
        user_id: user?.id || null,
        remark: text,
        type: "manual",
      },
    ]);

    if (error) {
      toast.error("Failed to add remark");
      return;
    }

    // clear draft; refresh remarks for selected task and preview last remark
    setRemarkDraftByTask((d) => ({ ...d, [taskId]: "" }));
    if (selectedTaskId === taskId) await fetchRemarksForTask(taskId);
    await fetchLatestRemarksForTasks([taskId]);
    toast.success("Remark added");
  };

  // assign member
  const assignTask = async (taskId, userId) => {
    const { error } = await supabase
      .from("kanban_tasks")
      .update({ assigned_to: userId || null })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to assign");
      return;
    }
    toast.success("Assignee updated");
    await fetchTasks();
  };

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  return (
    <div className="project-details-wrapper">
<div className="project-title-row">
  <h2 className="project-title">
    {project.name} <span className="muted">— Details</span>
  </h2>
  <button
    className="kanban-btn purple"
    onClick={() => setShowEditProjectModal(true)}
  >
    ✏️ Edit Project
  </button>
</div>

      {/* Members inline under title */}
      {members.length > 0 && (
        <div className="member-row">
          {members.map((m, i) => (
            <span key={m.user_id || i}>
              {m.profiles?.full_name || "Unknown"}
            </span>
          ))}
        </div>
      )}

      {/* ===== TASKS ===== */}
      <section className="details-section">
        <div className="section-header">
          <div className="section-left">
            <FaClipboardList className="section-icon task-icon" />
            <h3>Tasks</h3>
          </div>
          <div className="section-actions">
            <button className="kanban-btn blue" onClick={() => setShowTaskModal(true)}>
              + Task
            </button>
            <button className="kanban-btn green" onClick={() => setShowMemberModal(true)}>
              + Member
            </button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <p className="empty-text">No tasks yet.</p>
        ) : (
          <div className="task-list">
            {tasks.map((t) => {
              const isSelected = selectedTaskId === t.id;
              const isExpanded = expandedTaskId === t.id;
              const last = lastRemarkByTask[t.id];
              return (
                <div
                  key={t.id}
                  className={`task-row ${isSelected ? "selected" : ""}`}
                >
                  {/* clicking card selects task (left panel shows its remarks) */}
                  <div
                    className="task-summary"
                    onClick={() => selectTask(t.id)}
                    title="Select to view remarks below"
                  >
                    <span className="task-name">{t.title}</span>
                    <span className="task-deadline">
                      {t.deadline ? new Date(t.deadline).toLocaleDateString() : "—"}
                    </span>
                    <span className="task-remark-inline">
                      {last
                        ? `${last.profiles?.full_name || "Unknown"}: ${last.remark}`
                        : "No remarks yet"}
                    </span>
                  </div>

                  {/* expand arrow */}
                  <button
                    className="expand-btn-large"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(t.id);
                    }}
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                  </button>

                  {/* inline expansion with FEW fields + actions */}
                  {isExpanded && (
                    <div className="task-inline">
                      <div className="task-inline-grid">
                        <div>
                          <div className="ti-label">Description</div>
                          <div className="ti-value">{t.description || "—"}</div>
                        </div>
                        <div>
                          <div className="ti-label">Deadline</div>
                          <div className="ti-value">
                            {t.deadline
                              ? new Date(t.deadline).toLocaleDateString()
                              : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="ti-label">Status</div>
                          <div className="ti-value">{t.status || "—"}</div>
                        </div>
                        <div>
                          <div className="ti-label">Assignee</div>
                          <div className="ti-value">
                            {t.assigned_to
                              ? members.find((m) => m.user_id === t.assigned_to)?.profiles
                                  ?.full_name || "—"
                              : "Unassigned"}
                          </div>
                        </div>
                      </div>

                      <div className="task-inline-actions">
                        <button
                          className="btn-outline"
                          onClick={() => setEditTask(t)}
                          title="Edit task (modal)"
                        >
                          📝 Edit
                        </button>

                        <button
                          className="btn-outline"
                          onClick={() =>
                            setShowAssigneePickerFor(
                              showAssigneePickerFor === t.id ? null : t.id
                            )
                          }
                          title="Assign to member"
                        >
                          👤 Assign
                        </button>

                        <button
                          className="btn-outline"
                          onClick={() =>
                            setShowRemarkInputFor(
                              showRemarkInputFor === t.id ? null : t.id
                            )
                          }
                          title="Add a remark"
                        >
                          💬 Add Remark
                        </button>
                      </div>

                      {/* assign picker */}
                      {showAssigneePickerFor === t.id && (
                        <div className="assign-inline">
                          <select
                            value={t.assigned_to || ""}
                            onChange={(e) => assignTask(t.id, e.target.value || null)}
                          >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                              <option key={m.user_id} value={m.user_id}>
                                {m.profiles?.full_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* remark input */}
                      {showRemarkInputFor === t.id && (
                        <div className="remark-inline">
                          <textarea
                            value={remarkDraftByTask[t.id] || ""}
                            onChange={(e) =>
                              setRemarkDraftByTask((prev) => ({
                                ...prev,
                                [t.id]: e.target.value,
                              }))
                            }
                            placeholder="Write a remark..."
                          />
                          <div className="remark-inline-actions">
                            <button
                              className="btn-blue small"
                              onClick={() => addRemark(t.id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn-gray small"
                              onClick={() => {
                                setShowRemarkInputFor(null);
                                setRemarkDraftByTask((d) => ({ ...d, [t.id]: "" }));
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== REMARKS TWO-COLUMN SECTION ===== */}
      <section className="details-section two-column">
        <div className="column">
          <h3>Task Remarks</h3>
          {!selectedTaskId ? (
            <p className="empty-text">Select a task to view remarks.</p>
          ) : selectedTaskRemarks.length === 0 ? (
            <p className="empty-text">No remarks yet for this task.</p>
          ) : (
            <div className="remarks-compact">
              {selectedTaskRemarks.map((r) => (
                <div className="remark-chip" key={r.id}>
                  <div className="rc-line">
                    <strong>{r.profiles?.full_name || "Unknown"}:</strong>{" "}
                    <span className="rc-text">{r.remark}</span>
                  </div>
                  <div className="rc-time">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="column">
          <h3>Project Remarks</h3>
          {projectRemarks.length === 0 ? (
            <p className="empty-text">No project remarks yet.</p>
          ) : (
            <div className="remarks-compact">
              {projectRemarks.map((r) => (
                <div className="remark-chip" key={r.id}>
                  <div className="rc-line">
                    <strong>{r.profiles?.full_name || "Unknown"}:</strong>{" "}
                    <span className="rc-text">{r.remark}</span>
                  </div>
                  <div className="rc-time">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MODALS */}
      {showTaskModal && (
        <TaskFormModal
          project={project}
          onClose={() => setShowTaskModal(false)}
          onTaskAdded={fetchTasks}
        />
      )}
{showEditProjectModal && (
  <ProjectFormEdit
    project={project}
    onClose={() => setShowEditProjectModal(false)}
    onProjectUpdated={() => {
      toast.success("Project updated");
      setShowEditProjectModal(false);
    }}
  />
)}

      {showMemberModal && (
        <AddMemberModal
          projectId={project.project_id}
          onClose={() => setShowMemberModal(false)}
          onMemberAdded={fetchMembers}
        />
      )}
      {editTask && (
        <TaskDetailModal
          task={editTask}
          onClose={() => setEditTask(null)}
        />
      )}
    </div>
  );
}
