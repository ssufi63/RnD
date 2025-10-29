import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { FaClipboardList, FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./ProjectDetailsPanel.css";
import TaskFormModal from "./modals/TaskFormModal";
import AddMemberModal from "./modals/AddMemberModal";
import ProjectFormEdit from "./modals/ProjectFormEdit";
import TaskDetailModal from "./modals/TaskDetailModal";
import { formatPrettyDate } from "../utils/formatDate";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

/**
 * Props:
 * - project (required)
 * - hideHeader (optional)
 */
export default function ProjectDetailsPanel({ project, hideHeader = false }) {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [lastRemarkByTask, setLastRemarkByTask] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [selectedTaskRemarks, setSelectedTaskRemarks] = useState([]);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const [assigneePickerOpenFor, setAssigneePickerOpenFor] = useState(null);
  const [remarkEditorOpenFor, setRemarkEditorOpenFor] = useState(null);
  const [remarkDraftByTask, setRemarkDraftByTask] = useState({});

  // auth
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    })();
  }, []);

// load data + realtime
useEffect(() => {
  if (!project?.project_id) return;

  fetchTasks();
  fetchMembers();

  // --- Setup realtime channel ---
  const channel = supabase.channel(`rt-project-${project.project_id}`);

  const refresh = () => {
    // slight debounce to avoid multiple triggers at once
    clearTimeout(window._realtimeFetchTimeout);
    window._realtimeFetchTimeout = setTimeout(() => fetchTasks(), 200);
  };

  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "kanban_tasks",
        filter: `project_id=eq.${project.project_id}`,
      },
      refresh
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "task_remarks",
        filter: `project_id=eq.${project.project_id}`,
      },
      refresh
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [project?.project_id]);


  // fetch tasks
  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("kanban_tasks")
        .select("*")
        .eq("project_id", project.project_id);

      if (error) throw error;

      const sorted = [...(data || [])].sort((a, b) => {
        // Prefer order_index if present, otherwise fallback to deadline/created_at
        const ai = typeof a.order_index === "number" ? a.order_index : null;
        const bi = typeof b.order_index === "number" ? b.order_index : null;
        if (ai !== null || bi !== null) {
          return (ai ?? Number.MAX_SAFE_INTEGER) - (bi ?? Number.MAX_SAFE_INTEGER);
        }
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        if (da !== db) return da - db;
        const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
        const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ca - cb;
      });

      setTasks(sorted);
      if (sorted.length) {
        await fetchLatestRemarksForTasks(sorted.map((t) => t.id));
      } else {
        setLastRemarkByTask({});
      }
    } catch (e) {
      console.error("fetchTasks error:", e);
      setTasks([]);
      setLastRemarkByTask({});
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("project_members")
        .select("user_id, profiles(full_name, email)")
        .eq("project_id", project.project_id);

      if (error) throw error;
      setMembers(data || []);
    } catch (e) {
      console.error("fetchMembers error:", e);
      setMembers([]);
    }
  };

  const fetchLatestRemarksForTasks = async (taskIds) => {
    if (!taskIds?.length) return setLastRemarkByTask({});
    const { data, error } = await supabase
      .from("task_remarks")
      .select("task_id, remark, created_at, profiles(full_name)")
      .in("task_id", taskIds)
      .order("created_at", { ascending: false });
    if (error) return;
    const map = {};
    (data || []).forEach((r) => {
      if (!map[r.task_id]) map[r.task_id] = r;
    });
    setLastRemarkByTask(map);
  };

  // fetch remarks for expanded task
  const selectTask = async (taskId) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
    setSelectedTaskId(taskId);
    setAssigneePickerOpenFor(null);
    setRemarkEditorOpenFor(null);
    if (!taskId) return setSelectedTaskRemarks([]);
    const { data, error } = await supabase
      .from("task_remarks")
      .select("id, remark, created_at, profiles(full_name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    if (!error) setSelectedTaskRemarks(data || []);
  };

  const updateAssignee = async (taskId, userId) => {
    const { error } = await supabase
      .from("kanban_tasks")
      .update({ assigned_to: userId || null })
      .eq("id", taskId);
    if (!error) {
      setAssigneePickerOpenFor(null);
      await fetchTasks();
    }
  };

  const saveRemark = async (taskId) => {
    const text = (remarkDraftByTask[taskId] || "").trim();
    if (!text) return;
    const { error } = await supabase.from("task_remarks").insert([
      {
        task_id: taskId,
        user_id: user?.id || null,
        remark: text,
        type: "manual",
      },
    ]);
    if (!error) {
      setRemarkDraftByTask((d) => ({ ...d, [taskId]: "" }));
      setRemarkEditorOpenFor(null);
      await selectTask(taskId);
      await fetchLatestRemarksForTasks([taskId]);
    }
  };

  const cancelRemark = (taskId) => {
    setRemarkEditorOpenFor(null);
    setRemarkDraftByTask((d) => ({ ...d, [taskId]: "" }));
  };

  const handleTaskUpdated = async () => {
    await fetchTasks();
    if (selectedTaskId) await selectTask(selectedTaskId);
  };

  // DRAG & DROP — persist order_index (creates sequential order every time)
  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = Array.from(tasks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setTasks(reordered);

    // Persist sequential order_index (0..n-1). If the column doesn't exist,
    // the updates will be ignored harmlessly by PostgREST/Supabase.
    try {
      await Promise.all(
        reordered.map((t, idx) =>
          supabase.from("kanban_tasks").update({ order_index: idx }).eq("id", t.id)
        )
      );
    } catch (e) {
      console.warn("Order persist warning:", e?.message || e);
    }
  };

  return (
    <div className="project-details-wrapper">
      {/* Members row */}
      {members.length > 0 && (
        <div className="member-row">
          {members.map((m) => (
            <span key={m.user_id}>{m.profiles?.full_name || "Unknown"}</span>
          ))}
        </div>
      )}

      {/* TASKS */}
      <section className="details-section">
        <div className="section-header">
          <div className="section-left">
            <FaClipboardList className="section-icon task-icon" />
            <h3>Tasks</h3>
          </div>
        </div>

        {tasks.length === 0 ? (
          <p className="empty-text">No tasks yet.</p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="task-list">
              {(dropProvided) => (
                <div
                  className="task-list"
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                >
                  {tasks.map((t, index) => {
                    const isExpanded = expandedTaskId === t.id;
                    const last = lastRemarkByTask[t.id];
                    const assigneeName =
                      t.assigned_to &&
                      members.find((m) => m.user_id === t.assigned_to)?.profiles
                        ?.full_name;

                    return (
                      <Draggable key={t.id} draggableId={String(t.id)} index={index}>
                        {(dragProvided) => (
                          <div
                            className={`task-row ${
                              t.status === "Completed" ? "completed-task" : ""
                            }`}
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            {/* summary row */}
                            <div
                              className="task-summary"
                              onClick={() => selectTask(t.id)}
                            >
                              {/* Assignee pill FIRST */}
                              <span className="task-assignee">
                                {assigneeName || "Unassigned"}
                              </span>

                              {/* Task name (left aligned) */}
                              <span className="task-name">
                                {t.status === "Completed" && (
                                  <span className="checkmark">✓</span>
                                )}{" "}
                                {t.title}
                              </span>

                              {/* Date (deadline or completion) */}
                              <span className="task-deadline">
                                {t.status === "Completed"
                                  ? t.completion_date
                                    ? formatPrettyDate(t.completion_date)
                                    : "—"
                                  : t.deadline
                                  ? formatPrettyDate(t.deadline)
                                  : "—"}
                              </span>

                              {/* Last remark inline */}
                              <span className="task-remark-inline">
                                {last
                                  ? ` ${
                                      last.remark
                                    }`
                                  : "No remarks yet"}
                              </span>

                              <button
                                className="expand-btn-large"
                                title={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                              </button>
                            </div>

                            {/* expanded details */}
                            {isExpanded && (
                              <div className="task-inline">
                                <div className="task-inline-grid">
                                  <div>
                                    <div className="ti-label">Title</div>
                                    <div className="ti-value">
                                      {t.title || "—"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="ti-label">
                                      {t.status === "Completed"
                                        ? "Completed On"
                                        : "Deadline"}
                                    </div>
                                    <div className="ti-value">
                                      {t.status === "Completed"
                                        ? t.completion_date
                                          ? formatPrettyDate(t.completion_date)
                                          : "—"
                                        : t.deadline
                                        ? formatPrettyDate(t.deadline)
                                        : "—"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="ti-label">Status</div>
                                    <div className="ti-value">
                                      {t.status || "—"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="ti-label">Description</div>
                                    <div className="ti-value">
                                      {t.description || "—"}
                                    </div>
                                  </div>
                                </div>

                                {/* inline actions */}
                                <div className="task-inline-actions">
                                  <button
                                    className="btn-outline"
                                    onClick={() => setEditTask(t)}
                                  >
                                    📝 Edit
                                  </button>

                                  <button
                                    className="btn-outline"
                                    onClick={() =>
                                      setAssigneePickerOpenFor(
                                        assigneePickerOpenFor === t.id ? null : t.id
                                      )
                                    }
                                  >
                                    👤 Assign
                                  </button>

                                  <button
                                    className="btn-outline"
                                    onClick={() =>
                                      setRemarkEditorOpenFor(
                                        remarkEditorOpenFor === t.id ? null : t.id
                                      )
                                    }
                                  >
                                    💬 Add Remark
                                  </button>
                                </div>

                                {/* assign dropdown */}
                                {assigneePickerOpenFor === t.id && (
                                  <div className="assign-inline">
                                    <select
                                      value={t.assigned_to || ""}
                                      onChange={(e) =>
                                        updateAssignee(t.id, e.target.value || null)
                                      }
                                    >
                                      <option value="">Unassigned</option>
                                      {members.map((m) => (
                                        <option key={m.user_id} value={m.user_id}>
                                          {m.profiles?.full_name || m.user_id}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {/* remark editor */}
                                {remarkEditorOpenFor === t.id && (
                                  <div className="remark-inline">
                                    <textarea
                                      value={remarkDraftByTask[t.id] || ""}
                                      placeholder="Write a remark..."
                                      onChange={(e) =>
                                        setRemarkDraftByTask((d) => ({
                                          ...d,
                                          [t.id]: e.target.value,
                                        }))
                                      }
                                    />
                                    <div className="remark-inline-actions">
                                      <button
                                        className="btn-blue small"
                                        onClick={() => saveRemark(t.id)}
                                      >
                                        Save
                                      </button>
                                      <button
                                        className="btn-gray small"
                                        onClick={() => cancelRemark(t.id)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* task remarks list */}
                                {selectedTaskId === t.id &&
                                  selectedTaskRemarks.length > 0 && (
                                    <div className="task-remarks-inline">
                                      <h4>Remarks</h4>
                                      {selectedTaskRemarks.map((r) => (
                                        <div key={r.id} className="remark-chip">
                                          <div className="rc-line">
                                            <strong>
                                              {r.profiles?.full_name || "Unknown"}:
                                            </strong>{" "}
                                            <span className="rc-text">{r.remark}</span>
                                          </div>
                                          <div className="rc-time">
                                            {formatPrettyDate(r.created_at)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </section>

      {/* Modals */}
      {showTaskModal && (
        <TaskFormModal
          project={project}
          onClose={() => setShowTaskModal(false)}
          onTaskAdded={fetchTasks}
        />
      )}
      {showMemberModal && (
        <AddMemberModal
          projectId={project.project_id}
          onClose={() => setShowMemberModal(false)}
          onMemberAdded={fetchMembers}
        />
      )}
      {showEditProjectModal && (
        <ProjectFormEdit
          project={project}
          onClose={() => setShowEditProjectModal(false)}
          onProjectUpdated={fetchTasks}
        />
      )}
   {editTask && (
  <TaskDetailModal
    task={editTask}
    onClose={() => setEditTask(null)}
    onTaskUpdated={async () => {
      await handleTaskUpdated();
      setEditTask(null); // 👈 closes modal right after Save
    }}
  />
)}

    </div>
  );
}
