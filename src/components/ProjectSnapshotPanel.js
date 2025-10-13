import React, { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  FaUsers,
  FaClock,
  FaTasks,
  FaComments,
  FaChartLine,
  FaChartBar,
  FaSync,
  FaHeartbeat,
} from "react-icons/fa";
import Chart from "chart.js/auto";
import "./ProjectSnapshotPanel.css";

export default function ProjectSnapshotPanel({ project }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const chartRef = useRef(null);
  const statusChartRef = useRef(null);
  const chartInstance = useRef(null);
  const statusChartInstance = useRef(null);

  const fetchData = async () => {
    if (!project?.project_id) return;
    setLoading(true);
    try {
      const { data: tData, error: tErr } = await supabase
        .from("kanban_tasks")
        .select("*, assigned_to(full_name)")
        .eq("project_id", project.project_id);

      const { data: mData, error: mErr } = await supabase
        .from("project_members")
        .select("user_id, profiles: user_id (full_name)")
        .eq("project_id", project.project_id);

      const { data: rData, error: rErr } = await supabase
        .from("project_remarks")
        .select("remark, created_at, profiles: created_by (full_name)")
        .eq("project_id", project.project_id)
        .order("created_at", { ascending: false });

      if (tErr || mErr || rErr)
        console.error("Supabase errors:", { tErr, mErr, rErr });

      setTasks(tData || []);
      setMembers(mData || []);
      setRemarks(rData || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load project data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!project?.project_id) return;
    fetchData();

    const ch = supabase
      .channel(`rt-snapshot-${project.project_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kanban_tasks",
          filter: `project_id=eq.${project.project_id}`,
        },
        fetchData
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_remarks",
          filter: `project_id=eq.${project.project_id}`,
        },
        fetchData
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [project?.project_id]);

  // 🔹 Computed metrics
  const {
    completed,
    total,
    nextDeadline,
    overdueCount,
    daysToDelivery,
    lastActivity,
  } = useMemo(() => {
    if (!tasks.length)
      return {
        completed: 0,
        total: 0,
        nextDeadline: null,
        overdueCount: 0,
        daysToDelivery: null,
        lastActivity: null,
      };

    const done = tasks.filter((t) =>
      ["done", "completed"].includes(String(t.status || "").toLowerCase())
    ).length;

    const total = tasks.length;
    const deadlines = tasks
      .filter((t) => t.deadline)
      .map((t) => new Date(t.deadline));
    const now = new Date();
    const next = deadlines.filter((d) => d > now).sort((a, b) => a - b)[0];
    const overdue = deadlines.filter((d) => d < now).length;
    const daysToDelivery = next
      ? Math.ceil((next - now) / (1000 * 60 * 60 * 24))
      : null;

    const lastTaskUpdate = tasks.reduce((latest, t) => {
      const time = new Date(t.updated_at || t.created_at);
      return time > latest ? time : latest;
    }, new Date(0));

    return {
      completed: done,
      total,
      nextDeadline: next,
      overdueCount: overdue,
      daysToDelivery,
      lastActivity: lastTaskUpdate,
    };
  }, [tasks]);

  const latestRemark = remarks[0];

  // 🔹 Derived KPIs
  const health = useMemo(() => {
    if (!tasks.length) return "No Data";
    if (overdueCount > 3) return "At Risk";
    if (completed / total > 0.8) return "On Track";
    if (completed / total > 0.5) return "Behind";
    return "Critical";
  }, [tasks, overdueCount]);

  const avgCompletionDays = useMemo(() => {
    const completedTasks = tasks.filter(
      (t) => t.status?.toLowerCase() === "completed"
    );
    const durations = completedTasks
      .map(
        (t) =>
          (new Date(t.updated_at) - new Date(t.start_date)) /
          (1000 * 60 * 60 * 24)
      )
      .filter((v) => v > 0);
    return durations.length
      ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
      : null;
  }, [tasks]);

  const topContributor = useMemo(() => {
    const counts = {};
    tasks.forEach((t) => {
      if (t.status?.toLowerCase() === "completed") {
        const name = t.assigned_to?.full_name || "Unassigned";
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], completed: top[1] } : null;
  }, [tasks]);

  // 🔹 Chart: Tasks per member
  useEffect(() => {
    if (!chartRef.current) return;

    const taskCountByMember = {};
    tasks.forEach((t) => {
      const name = t.assigned_to?.full_name || "Unassigned";
      taskCountByMember[name] = (taskCountByMember[name] || 0) + 1;
    });

    const labels = Object.keys(taskCountByMember);
    const data = Object.values(taskCountByMember);

    if (chartInstance.current) chartInstance.current.destroy();

    chartInstance.current = new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Tasks",
            data,
            backgroundColor: "rgba(99, 102, 241, 0.8)",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: "#4b5563", font: { size: 11 } } },
          y: { ticks: { color: "#6b7280", stepSize: 1 }, grid: { color: "#e5e7eb" } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }, [tasks]);

  // 🔹 Chart: Task status distribution
  useEffect(() => {
    if (!statusChartRef.current) return;

    const statusCounts = tasks.reduce((acc, t) => {
      const s = t.status || "Unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);

    if (statusChartInstance.current) statusChartInstance.current.destroy();

    statusChartInstance.current = new Chart(statusChartRef.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              "#60a5fa",
              "#fbbf24",
              "#34d399",
              "#f87171",
              "#a78bfa",
            ],
          },
        ],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });
  }, [tasks]);

  if (!project)
    return <div className="snapshot-empty">Select a project.</div>;

  if (loading)
    return <div className="snapshot-loading">Loading project snapshot…</div>;

  return (
    <div className="snapshot-panel">
      <div className="snapshot-header">
        <FaChartLine className="snapshot-header-icon" />
        <h3>Project Snapshot</h3>
        <button className="refresh-btn" onClick={fetchData}>
          <FaSync /> Refresh
        </button>
      </div>

      <div className="snapshot-grid">
        {/* Project Health */}
        <div className="snapshot-card">
          <div className="snapshot-card-header">
            <FaHeartbeat className="icon red" />
            <h4>Project Health</h4>
          </div>
          <div className={`health-badge ${health.toLowerCase().replace(" ", "-")}`}>
            {health}
          </div>
          <p className="small-text">
            Avg completion time: {avgCompletionDays ? `${avgCompletionDays} days` : "N/A"}
          </p>
          <p className="small-text">
            ⭐ Top contributor: {topContributor ? `${topContributor.name} (${topContributor.completed})` : "N/A"}
          </p>
        </div>

        {/* Progress */}
        <div className="snapshot-card">
          <div className="snapshot-card-header">
            <FaTasks className="icon blue" />
            <h4>Progress</h4>
          </div>
          <p className="muted-text">{completed}/{total} tasks done</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width:
                  total === 0 ? "0%" : Math.min(100, (completed / total) * 100) + "%",
              }}
            ></div>
          </div>
        </div>

        {/* Deadline */}
        <div className="snapshot-card">
          <div className="snapshot-card-header">
            <FaClock className="icon yellow" />
            <h4>Deadline</h4>
          </div>
          <p className="muted-text">
            {nextDeadline
              ? nextDeadline.toLocaleDateString()
              : "No upcoming deadline"}
          </p>
          <p className="small-text">
            {daysToDelivery ? `${daysToDelivery} days remaining` : "No schedule"}
          </p>
          {overdueCount > 0 && (
            <p className="small-text danger">
              ⚠️ {overdueCount} overdue task{overdueCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Team */}
        {/* <div className="snapshot-card">
          <div className="snapshot-card-header">
            <FaUsers className="icon green" />
            <h4>Team</h4>
          </div>
          <p className="muted-text">
            Active: <strong>{members.length}</strong>
          </p>
          <div className="member-badges">
            {members.slice(0, 3).map((m) => (
              <span key={m.user_id} className="badge">
                {m.profiles?.full_name?.split(" ")[0]}
              </span>
            ))}
            {members.length > 3 && (
              <span className="extra-count">+{members.length - 3} more</span>
            )}
          </div>
        </div> */}

        {/* Remarks */}
        {/* <div className="snapshot-card">
          <div className="snapshot-card-header">
            <FaComments className="icon purple" />
            <h4>Remark</h4>
          </div>
          {latestRemark ? (
            <p className="remark-text">“{latestRemark.remark}”</p>
          ) : (
            <p className="muted-text">No remarks yet.</p>
          )}
        </div> */}

        {/* Activity */}
        <div className="snapshot-card activity">
          <FaChartBar className="icon indigo" />
          <span className="muted-text">
            Last activity:{" "}
            {lastActivity
              ? lastActivity.toLocaleString()
              : "No recent updates"}
          </span>
        </div>

        {/* Tasks per Member */}
        <div className="snapshot-card chart-card">
          <div className="snapshot-card-header">
            <FaChartLine className="icon indigo" />
            <h4>Tasks per Member</h4>
          </div>
          <div className="chart-wrapper">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        {/* Task Status */}
        <div className="snapshot-card chart-card">
          <div className="snapshot-card-header">
            <FaChartLine className="icon pink" />
            <h4>Task Status</h4>
          </div>
          <div className="chart-wrapper">
            <canvas ref={statusChartRef}></canvas>
          </div>
        </div>
      </div>

      <div className="last-updated">
        Last synced:{" "}
        {lastUpdated ? lastUpdated.toLocaleTimeString() : "Just now"}
      </div>
    </div>
  );
}
