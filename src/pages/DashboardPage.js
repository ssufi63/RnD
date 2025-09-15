// src/pages/DashboardPage.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("tasks").select("*");
      if (error) console.error(error);
      else setTasks(data || []);
    })();
  }, []);

  // -------- Helpers --------
  const groupBy = (arr, key) =>
    arr.reduce((acc, x) => {
      const k = x[key] || "Unknown";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

  const byStatus = Object.entries(groupBy(tasks, "status")).map(([k, v]) => ({
    name: k,
    value: v,
  }));

  const byProduct = Object.entries(groupBy(tasks, "product")).map(([k, v]) => ({
    name: k,
    count: v,
  }));

  const byPriority = Object.entries(groupBy(tasks, "priority")).map(
    ([k, v]) => ({
      name: k,
      value: v,
    })
  );

  // Tasks created by date
  const byDate = Object.entries(
    tasks.reduce((acc, t) => {
      const d = new Date(t.created_at).toLocaleDateString("en-CA");
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {})
  )
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, count]) => ({ date, count }));

  // Department × Status stacked data
  const deptStatus = (() => {
    const grouped = {};
    tasks.forEach((t) => {
      const dept = t.department || "Unknown";
      const status = t.status || "Unknown";
      if (!grouped[dept]) grouped[dept] = {};
      grouped[dept][status] = (grouped[dept][status] || 0) + 1;
    });
    return Object.entries(grouped).map(([dept, statuses]) => ({
      department: dept,
      ...statuses,
    }));
  })();

  const statuses = [...new Set(tasks.map((t) => t.status || "Unknown"))];

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#6f42c1",
    "#dc3545",
    "#20c997",
  ];

  // -------- UI --------
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>Dashboard</h1>

      {/* Grid layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Total tasks */}
        <Card>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Total Tasks</h2>
          <div style={{ fontSize: 40, fontWeight: "700", color: "#0d6efd" , textAlign: "center" }}>
            {tasks.length}
          </div>
        </Card>

        {/* Pie Chart → Status */}
        <Card title="Tasks by Status">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={byStatus}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {byStatus.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Bar Chart → Product */}
        <Card title="Tasks by Product">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byProduct}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0d6efd">
                {byProduct.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Donut Chart → Priority */}
        <Card title="Tasks by Priority">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={byPriority}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {byPriority.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Line Chart → Over Time */}
        <Card title="Tasks Created Over Time">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={byDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#00C49F"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Stacked Bar Chart → Department × Status */}
        <Card title="Department vs Status">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {statuses.map((st, i) => (
                <Bar
                  key={st}
                  dataKey={st}
                  stackId="a"
                  fill={COLORS[i % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// 🔹 Reusable Card Wrapper
function Card({ title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
        padding: 16,
      }}
    >
      {title && <h3 style={{ marginBottom: 10 }}>{title}</h3>}
      {children}
    </div>
  );
}
