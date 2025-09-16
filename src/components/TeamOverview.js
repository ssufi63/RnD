// src/components/TeamOverview.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./TeamOverview.css"; // ✅ external stylesheet

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

  const users = Object.values(grouped).sort((a, b) =>
    a.user.full_name.localeCompare(b.user.full_name)
  );

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="team-container">
      <h2 className="pageTitle">👥 Team Tasks Overview</h2>

      {/* Alphabet Index */}
      <div className="alphaIndex">
        {alphabet.map((letter) => (
          <a key={letter} href={`#${letter}`} className="alphaLetter">
            {letter}
          </a>
        ))}
      </div>

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
            id={user.full_name.charAt(0).toUpperCase()}
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
                <div className="avatarLarge">{user.full_name?.charAt(0) || "?"}</div>
                <h3 className="userName">{user.full_name}</h3>
                <p className="userDept">{user.department}</p>
                <p className="taskSummary">Total Tasks: <strong>{summary.total}</strong></p>

                {/* Status breakdown chips */}
                <div className="statusChips">
                  {Object.entries(summary.byStatus).map(([k, v]) => (
                    <span key={k} className={`chip status-${k.toLowerCase().replace(" ", "-")}`}>
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Expanded Task Grid */}
            {expandedUserId === user.id && (
              <div className="gridWrapper">
                {tasks.map((task) => (
                  <div key={task.id} className="taskCard">
                    <strong>{task.task_title ?? "(Untitled)"}</strong>
                    <div className="badgeRow">
                      <span className={getBadgeClass("product", task.product)}>{task.product}</span>
                      <span className={getBadgeClass("status", task.status)}>{task.status}</span>
                      <span className={getBadgeClass("priority", task.priority)}>{task.priority}</span>
                    </div>
                    <p className="taskMeta">📅 {task.deadline ? task.deadline.slice(0, 10) : "No deadline"}</p>
                    <p className="taskMetaSmall">{task.task_type}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
