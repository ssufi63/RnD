// src/components/TeamOverview.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function TeamOverview() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState(null);

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

      if (error) {
        console.error("Error loading team tasks:", error);
      } else {
        setTasks(data || []);
      }
      setLoading(false);
    };

    fetchTasks();
  }, []);

  const getBadgeStyle = (type, value) => {
    const palettes = {
      product: {
        AC: { bg: "#dbeafe", color: "#1e40af" },
        REF: { bg: "#dcfce7", color: "#166534" },
        MWO: { bg: "#fef9c3", color: "#92400e" },
        WP: { bg: "#cffafe", color: "#155e75" },
        CC: { bg: "#ede9fe", color: "#5b21b6" },
      },
      status: {
        "Not Started": { bg: "#f3f4f6", color: "#374151" },
        "In Progress": { bg: "#e0f2fe", color: "#0369a1" },
        "On Hold": { bg: "#fef9c3", color: "#854d0e" },
        "Completed": { bg: "#dcfce7", color: "#166534" },
        "Cancelled": { bg: "#fee2e2", color: "#991b1b" },
      },
      priority: {
        High: { bg: "#fee2e2", color: "#991b1b" },
        Medium: { bg: "#fef9c3", color: "#854d0e" },
        Low: { bg: "#dcfce7", color: "#166534" },
        Urgent: { bg: "#ede9fe", color: "#5b21b6" },
      },
    };
    return palettes[type][value] || { bg: "#f3f4f6", color: "#374151" };
  };

  if (loading) return <p>Loading team tasks...</p>;
  if (!tasks || tasks.length === 0)
    return <p style={{ textAlign: "center" }}>No team tasks found</p>;

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

  // Sort users alphabetically
  const users = Object.values(grouped).sort((a, b) =>
    a.user.full_name.localeCompare(b.user.full_name)
  );

  // Alphabet index
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>👥 Team Tasks Overview</h2>

      {/* Alphabet Index */}
      <div style={styles.alphaIndex}>
        {alphabet.map((letter) => (
          <a
            key={letter}
            href={`#${letter}`}
            style={styles.alphaLetter}
          >
            {letter}
          </a>
        ))}
      </div>

      {users.map(({ user, tasks }) => {
        // summary info
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
            id={user.full_name.charAt(0).toUpperCase()}
            style={styles.userSection}
          >
            {/* User Summary Card */}
            <div
              style={{
                ...styles.userCard,
                background:
                  expandedUserId === user.id
                    ? "linear-gradient(135deg, #e0f2fe, #f0f9ff)"
                    : "linear-gradient(135deg, #f9fafb, #f3f4f6)",
              }}
              onClick={() =>
                setExpandedUserId(
                  expandedUserId === user.id ? null : user.id
                )
              }
            >
              <div style={styles.userCardContent}>
                <div style={styles.avatarLarge}>
                  {user.full_name?.charAt(0) || "?"}
                </div>
                <h3 style={styles.userName}>{user.full_name}</h3>
                <p style={styles.userDept}>{user.department}</p>
                <p style={styles.taskSummary}>
                  Total Tasks: <strong>{summary.total}</strong>
                </p>

                {/* Status breakdown chips */}
                <div style={styles.statusChips}>
                  {Object.entries(summary.byStatus).map(([k, v]) => (
                    <span
                      key={k}
                      style={{
                        ...styles.chip,
                        backgroundColor:
                          k === "Completed"
                            ? "#dcfce7"
                            : k === "In Progress"
                            ? "#e0f2fe"
                            : k === "On Hold"
                            ? "#fef9c3"
                            : k === "Cancelled"
                            ? "#fee2e2"
                            : "#f3f4f6",
                        color:
                          k === "Completed"
                            ? "#166534"
                            : k === "In Progress"
                            ? "#0369a1"
                            : k === "On Hold"
                            ? "#854d0e"
                            : k === "Cancelled"
                            ? "#991b1b"
                            : "#374151",
                      }}
                    >
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Expanded Tasks */}
            {expandedUserId === user.id && (
              <div style={styles.gridWrapper}>
                {tasks.map((task) => {
                  const displayTitle = task.task_title ?? "(Untitled)";
                  const productBadge = getBadgeStyle("product", task.product);
                  const statusBadge = getBadgeStyle("status", task.status);
                  const priorityBadge = getBadgeStyle("priority", task.priority);

                  return (
                    <div key={task.id} style={styles.card}>
                      <strong>{displayTitle}</strong>
                      <div style={styles.badgeRow}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor: productBadge.bg,
                            color: productBadge.color,
                          }}
                        >
                          {task.product}
                        </span>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                          }}
                        >
                          {task.status}
                        </span>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor: priorityBadge.bg,
                            color: priorityBadge.color,
                          }}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <p style={styles.taskMeta}>
                        📅 {task.deadline ? task.deadline.slice(0, 10) : "No deadline"}
                      </p>
                      <p style={styles.taskMetaSmall}>{task.task_type}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    width: "90%",
    maxWidth: "1200px",
    margin: "20px auto",
    fontFamily: "Inter, Arial, sans-serif",
    padding: "0 10px",
  },
  pageTitle: {
    textAlign: "center",
    marginBottom: "20px",
    color: "#0d6efd",
  },
  alphaIndex: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "30px",
  },
  alphaLetter: {
    fontSize: "12px",
    padding: "4px 6px",
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: "600",
  },
  userSection: {
    marginBottom: "40px",
  },
  userCard: {
    padding: "20px",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    cursor: "pointer",
    transition: "all 0.3s ease",
    marginBottom: "16px",
  },
  userCardContent: {
    textAlign: "center",
  },
  avatarLarge: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "#e0e7ff",
    color: "#3730a3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "22px",
    margin: "0 auto 10px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },
  userName: {
    margin: "4px 0",
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
  },
  userDept: {
    margin: 0,
    fontSize: "14px",
    color: "#6b7280",
  },
  taskSummary: {
    margin: "8px 0",
    fontSize: "14px",
    color: "#374151",
  },
  statusChips: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "8px",
  },
  chip: {
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  gridWrapper: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px",
    background: "#fff",
    boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
    textAlign: "center",
  },
  badgeRow: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    margin: "10px 0",
    flexWrap: "wrap",
  },
  badge: {
    padding: "5px 12px",
    borderRadius: "14px",
    fontSize: "12px",
    fontWeight: "600",
  },
  taskMeta: {
    fontSize: "13px",
    color: "#374151",
    margin: "4px 0",
  },
  taskMetaSmall: {
    fontSize: "12px",
    color: "#6b7280",
  },
};
