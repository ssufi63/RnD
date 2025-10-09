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
} from "react-icons/fa";
import Chart from "chart.js/auto";
import "./ProjectSnapshotPanel.css";

export default function ProjectSnapshotPanel({ project }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!project?.project_id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: tData } = await supabase
          .from("kanban_tasks")
          .select("*, profiles(full_name)")
          .eq("project_id", project.project_id);
        setTasks(tData || []);

        const { data: mData } = await supabase
          .from("project_members")
          .select("user_id, profiles(full_name)")
          .eq("project_id", project.project_id);
        setMembers(mData || []);

        const { data: rData } = await supabase
          .from("project_remarks")
          .select("remark, created_at, profiles(full_name)")
          .eq("project_id", project.project_id)
          .order("created_at", { ascending: false });
        setRemarks(rData || []);
      } catch (err) {
        toast.error("Failed to load project data");
      } finally {
        setLoading(false);
      }
    };

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

  // 🔹 Chart setup
  useEffect(() => {
    if (!chartRef.current) return;

    const taskCountByMember = {};
    tasks.forEach((t) => {
      const name = t.profiles?.full_name || "Unassigned";
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
          x: {
            ticks: { color: "#4b5563", font: { size: 11 } },
          },
          y: {
            ticks: { color: "#6b7280", stepSize: 1 },
            grid: { color: "#e5e7eb" },
          },
        },
        plugins: { legend: { display: false } },
      },
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
      </div>

      <div className="snapshot-grid">
        {/* Progress */}
        <div className="snapshot-card">
          <div className="snapshot-card-header">
            <FaTasks className="icon blue" />
            <h4>Progress</h4>
          </div>
          <p className="muted-text">
            {completed}/{total} tasks done
          </p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width:
                  total === 0
                    ? "0%"
                    : Math.min(100, (completed / total) * 100) + "%",
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
            {daysToDelivery
              ? `${daysToDelivery} days remaining`
              : "No schedule"}
          </p>
          {overdueCount > 0 && (
            <p className="small-text danger">
              ⚠️ {overdueCount} overdue task
              {overdueCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Members */}
 {/*        <div className="snapshot-card">
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

        {/* Remark */}
        <div className="snapshot-card">
          <div className="snapshot-card-header">
            <FaComments className="icon purple" />
            <h4>Remark</h4>
          </div>
          {latestRemark ? (
            <p className="remark-text">“{latestRemark.remark}”</p>
          ) : (
            <p className="muted-text">No remarks yet.</p>
          )}
        </div>

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

        {/* Chart */}
        <div className="snapshot-card chart-card">
          <div className="snapshot-card-header">
            <FaChartLine className="icon indigo" />
            <h4>Tasks per Member</h4>
          </div>
          <div className="chart-wrapper">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
