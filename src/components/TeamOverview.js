import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./TeamOverview.css";

export default function TeamOverview() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [viewMode, setViewMode] = useState("card");
  const [searchQuery, setSearchQuery] = useState(""); // ✅ search state

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
    return `badge ${type}-${value.toLowerCase().replace(/\s+/g, "-")}`;
  };

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

  // ✅ Apply search filter
  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    users = users.filter(({ user }) =>
      user.full_name.toLowerCase().includes(q) ||
      user.department?.toLowerCase().includes(q)
    );
  }

  return (
    <div className="team-container">
      <h2 className="pageTitle">👥 Team Tasks Overview</h2>

      {/* ✅ Manual Search Box */}
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

      {/* 🔽 existing card/table rendering remains the same */}
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

            return (
              <div
                key={user.id || user.full_name}
                className="userSection"
              >
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
                          className={`chip status-${k.toLowerCase().replace(" ", "-")}`}
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
                    {tasks.map((task) => (
                      <div key={task.id} className="taskCard">
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
                        <p className="taskMetaSmall">{task.task_type}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ) : (
        /* ✅ Table View unchanged */
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
              {users.map(({ user, tasks }) => {
                const sortedTasks = [...tasks].sort((a, b) => {
                  if (a.status === "Completed" && b.status !== "Completed") return 1;
                  if (a.status !== "Completed" && b.status === "Completed") return -1;
                  return 0;
                });

                return (
                  <React.Fragment key={user.id || user.full_name}>
                    {/* Owner row */}
                    <tr className="ownerRow">
                      <td colSpan={10}>
                        👤 <strong>{user.full_name}</strong> ({user.department})
                      </td>
                    </tr>

                    {sortedTasks.map((task, idx) => (
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
                        <td>{task.start_date ? task.start_date.slice(0, 10) : "-"}</td>
                        <td>{task.deadline ? task.deadline.slice(0, 10) : "-"}</td>
                        <td>
                          {task.completion_date
                            ? task.completion_date.slice(0, 10)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
