import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./TeamOverview.css";

export default function TeamOverview() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [viewMode, setViewMode] = useState("card");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [selectedTask, setSelectedTask] = useState(null);
  const [visibleTasks, setVisibleTasks] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          task_title,
          product,
          status,
          priority,
          task_type,
          start_date,
          deadline,
          completion_date,
          remarks,
          linked_folder,
          assigned_by_label,
          assigned_to,
          profiles:assigned_to (
            id,
            full_name,
            department
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && data) setTasks(data);
      setLoading(false);
    };

    fetchTasks();
  }, []);

  const getBadgeClass = (type, value) => {
    if (!value) return "badge gray";
    return `badge ${type}-${String(value).toLowerCase().replace(/\s+/g, "-")}`;
  };

  const fmtDate = (s) => (s ? String(s).slice(0, 10) : "-");

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!selectedTask) return;

    const handleKey = (e) => {
      if (e.key === "ArrowRight" && selectedIndex < visibleTasks.length - 1) {
        const newIndex = selectedIndex + 1;
        setSelectedIndex(newIndex);
        setSelectedTask(visibleTasks[newIndex]);
      }
      if (e.key === "ArrowLeft" && selectedIndex > 0) {
        const newIndex = selectedIndex - 1;
        setSelectedIndex(newIndex);
        setSelectedTask(visibleTasks[newIndex]);
      }
      if (e.key === "Escape") {
        setSelectedTask(null);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedTask, selectedIndex, visibleTasks]);

  if (loading) return <p>Loading team tasks...</p>;
  if (!tasks.length) return <p style={{ textAlign: "center" }}>No team tasks found</p>;

  // Group tasks by user
  const grouped = tasks.reduce((acc, task) => {
    const userId = task.profiles?.id || "unknown";
    if (!acc[userId]) {
      acc[userId] = {
        user: task.profiles || { full_name: "Unknown", department: "-" },
        tasks: [],
      };
    }
    acc[userId].tasks.push(task);
    return acc;
  }, {});

  let users = Object.values(grouped).sort((a, b) =>
    a.user.full_name.localeCompare(b.user.full_name)
  );

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    users = users.filter(
      ({ user }) =>
        user.full_name.toLowerCase().includes(q) ||
        user.department?.toLowerCase().includes(q)
    );
  }

  return (
    <div className="team-container">
      <h2 className="pageTitle">👥 Team Tasks Overview</h2>

      {/* Search Box */}
      <div className="searchBox">
        <input
          type="text"
          placeholder="🔍 Search by name or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clearBtn" onClick={() => setSearchQuery("")}>
            ✖
          </button>
        )}
      </div>

      {/* View Toggle */}
      <div className="viewToggle">
        <button
          className={viewMode === "card" ? "active" : ""}
          onClick={() => setViewMode("card")}
        >
          📇 Card View
        </button>
        <button
          className={viewMode === "table" ? "active" : ""}
          onClick={() => setViewMode("table")}
        >
          📋 Table View
        </button>
      </div>

      {/* Card View */}
      {viewMode === "card" ? (
        <>
          {users.map(({ user, tasks }) => {
            const summary = {
              total: tasks.length,
              byStatus: tasks.reduce((acc, t) => {
                acc[t.status] = (acc[t.status] || 0) + 1;
                return acc;
              }, {}),
            };

            // sort tasks: non-completed by deadline first, completed last
            const sortedTasks = [...tasks].sort((a, b) => {
              if (a.status === "Completed" && b.status !== "Completed") return 1;
              if (a.status !== "Completed" && b.status === "Completed") return -1;
              const maxDate = new Date(8640000000000000);
              const aDeadline = a.deadline ? new Date(a.deadline) : maxDate;
              const bDeadline = b.deadline ? new Date(b.deadline) : maxDate;
              return aDeadline - bDeadline;
            });

            return (
              <div key={user.id || user.full_name} className="userSection">
                {/* User Card */}
                <div
                  className={`userCard ${expandedUserId === user.id ? "expanded" : ""}`}
                  onClick={() =>
                    setExpandedUserId(expandedUserId === user.id ? null : user.id)
                  }
                >
                  <div className="userCardContent">
                    <div className="avatarLarge">
                      {user.full_name?.charAt(0) || "?"}
                    </div>
                    <h3 className="userName">{user.full_name}</h3>
                    <p className="userDept">{user.department}</p>
                    <p className="taskSummary">
                      Total Tasks: <strong>{summary.total}</strong>
                    </p>
                    <div className="statusChips">
                      {Object.entries(summary.byStatus).map(([k, v]) => (
                        <span
                          key={k}
                          className={`chip status-${String(k)
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expanded Cards */}
                {expandedUserId === user.id && (
                  <div className="gridWrapper">
                    {sortedTasks.map((task, idx) => (
                      <div
                        key={task.id}
                        className="taskCard clickable"
                        onClick={() => {
                          setVisibleTasks(sortedTasks);
                          setSelectedIndex(idx);
                          setSelectedTask(task);
                        }}
                      >
                        <strong>{task.task_title ?? "(Untitled)"}</strong>
                        <div className="badgeRow">
                          <span className={getBadgeClass("product", task.product)}>
                            {task.product}
                          </span>
                          <span className={getBadgeClass("status", task.status)}>
                            {task.status}
                          </span>
                          <span className={getBadgeClass("priority", task.priority)}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="taskMeta">
                          📅 {task.deadline ? task.deadline.slice(0, 10) : "No deadline"}
                        </p>
                        <p className="taskMetaSmall">
                          👤 Assigned By: {task.assigned_by_label || "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ) : (
        /* Table View */
        <div className="taskTableWrapper">
          <table className="taskTable">
            <thead>
              <tr>
                <th>S/N</th>
                <th>Owner</th>
                <th>Title</th>
                <th>Product</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Task Type</th>
                <th>Start Date</th>
                <th>Deadline</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              {users.map(({ user, tasks }) => (
                <React.Fragment key={user.id || user.full_name}>
                  <tr className="ownerRow">
                    <td colSpan={10}>
                      👤 <strong>{user.full_name}</strong> ({user.department})
                    </td>
                  </tr>
                  {tasks.map((task, idx) => (
                    <tr
                      key={task.id}
                      className={
                        task.status === "Completed"
                          ? "taskRow completedTask"
                          : "taskRow"
                      }
                    >
                      <td>{idx + 1}</td>
                      <td>{user.full_name}</td>
                      <td>{task.task_title ?? "(Untitled)"}</td>
                      <td>{task.product || "-"}</td>
                      <td>{task.status || "-"}</td>
                      <td>{task.priority || "-"}</td>
                      <td>{task.task_type || "-"}</td>
                      <td>{fmtDate(task.start_date)}</td>
                      <td>{fmtDate(task.deadline)}</td>
                      <td>{fmtDate(task.completion_date)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal - Expanded Task Details */}
      {selectedTask && (
        <div className="modalOverlay" onClick={() => setSelectedTask(null)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>{selectedTask.task_title ?? "(Untitled Task)"}</h3>
              <button className="closeBtn" onClick={() => setSelectedTask(null)}>
                ✖
              </button>
            </div>

            <div className="modalBody">
              <div className="modalDetails">
                <p>
                  <strong>Product</strong>
                  <span>{selectedTask.product || "-"}</span>
                </p>
                <p>
                  <strong>Status</strong>
                  <span>
                    {selectedTask.status ? (
                      <span
                        className={`modalBadge status-${selectedTask.status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {selectedTask.status}
                      </span>
                    ) : (
                      "-"
                    )}
                  </span>
                </p>
                <p>
                  <strong>Priority</strong>
                  <span>
                    {selectedTask.priority ? (
                      <span
                        className={`modalBadge priority-${selectedTask.priority
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {selectedTask.priority}
                      </span>
                    ) : (
                      "-"
                    )}
                  </span>
                </p>
                <p>
                  <strong>Task Type</strong>
                  <span>{selectedTask.task_type || "-"}</span>
                </p>
                <p>
                  <strong>Start Date</strong>
                  <span>{fmtDate(selectedTask.start_date)}</span>
                </p>
                <p>
                  <strong>Deadline</strong>
                  <span>{fmtDate(selectedTask.deadline)}</span>
                </p>
                <p>
                  <strong>Completion Date</strong>
                  <span>{fmtDate(selectedTask.completion_date)}</span>
                </p>
                <p>
                  <strong>Assigned To</strong>
                  <span>{selectedTask.profiles?.full_name || "Unknown"}</span>
                </p>
                <p>
                  <strong>Department</strong>
                  <span>{selectedTask.profiles?.department || "-"}</span>
                </p>
                <p>
                  <strong>Assigned By</strong>
                  <span>{selectedTask.assigned_by_label || "N/A"}</span>
                </p>
                <p className="full">
                  <strong>Remarks</strong>
                  <span>{selectedTask.remarks || "-"}</span>
                </p>
                <p className="full">
                  <strong>Linked Folder</strong>
                  {selectedTask.linked_folder ? (
                    <a
                      href={selectedTask.linked_folder}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#1976d2", textDecoration: "underline" }}
                    >
                      Open Folder
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </p>
              </div>
            </div>

            <div className="modalFooter">
              <button
                className="navBtn"
                disabled={selectedIndex === 0}
                onClick={() => {
                  if (selectedIndex > 0) {
                    const newIndex = selectedIndex - 1;
                    setSelectedIndex(newIndex);
                    setSelectedTask(visibleTasks[newIndex]);
                  }
                }}
              >
                ← Previous
              </button>
              <button
                className="navBtn"
                disabled={selectedIndex === visibleTasks.length - 1}
                onClick={() => {
                  if (selectedIndex < visibleTasks.length - 1) {
                    const newIndex = selectedIndex + 1;
                    setSelectedIndex(newIndex);
                    setSelectedTask(visibleTasks[newIndex]);
                  }
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
