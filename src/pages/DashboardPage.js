import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, ResponsiveContainer
} from "recharts";
import Select from "react-select";
import "./DashboardPage.css";

// --- utils ---
const groupBy = (arr, key) =>
  arr.reduce((acc, x) => {
    const k = x[key] || "Unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });

// --- color palettes ---
const COLORS_LIGHT = ["#0088FE","#00C49F","#FFBB28","#FF8042","#6f42c1","#dc3545","#20c997"];
const COLORS_DARK  = ["#4dabf7","#63e6be","#ffd43b","#ff922b","#9775fa","#ff6b6b","#38d9a9"];

// --- Reusable DashboardCharts ---
function DashboardCharts({ tasks, darkMode, profileMap }) {
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [detailTitle, setDetailTitle] = useState("");

  const COLORS = darkMode ? COLORS_DARK : COLORS_LIGHT;

  // datasets
  const byStatus = useMemo(
    () => Object.entries(groupBy(tasks, "status")).map(([k, v]) => ({ name: k, value: v })),
    [tasks]
  );

  const byProduct = useMemo(
    () => Object.entries(groupBy(tasks, "product")).map(([k, v]) => ({ name: k, count: v })),
    [tasks]
  );

  const byPriority = useMemo(
    () => Object.entries(groupBy(tasks, "priority")).map(([k, v]) => ({ name: k, value: v })),
    [tasks]
  );

  const byDate = useMemo(() => {
    const grouped = tasks.reduce((acc, t) => {
      const d = formatDate(t.created_at);
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, count]) => ({ date, count }));
  }, [tasks]);

  const deptStatus = useMemo(() => {
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
  }, [tasks]);

  const statuses = [...new Set(tasks.map((t) => t.status || "Unknown"))];

  const showTasks = (filterFn, title) => {
    setSelectedTasks(tasks.filter(filterFn));
    setDetailTitle(title);
  };
  const closeModal = () => setSelectedTasks([]);

  // ESC closes modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <>
      <div className="dashboard-grid">
        {/* Total tasks */}
        <Card>
          <div className="dashboard-metric-title">Total Tasks</div>
          <div className="dashboard-metric">{tasks.length}</div>
        </Card>

        {/* Pie Chart → Status */}
        <Card title="Tasks by Status">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={byStatus}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%" outerRadius={90}
                label={({ name, value }) => `${name}: ${value}`}
                onClick={(data) =>
                  showTasks((t) => (t.status || "Unknown") === data.name, `Tasks with Status: ${data.name}`)
                }
              >
                {byStatus.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip /><Legend wrapperStyle={{ fontSize: "0.8rem" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Bar Chart → Product */}
        <Card title="Tasks by Product">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byProduct}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#444" : "#ccc"} />
              <XAxis dataKey="name" stroke={darkMode ? "#ddd" : "#333"} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke={darkMode ? "#ddd" : "#333"} tick={{ fontSize: 12 }} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: "0.8rem" }} />
              <Bar dataKey="count"
                onClick={(data) =>
                  showTasks((t) => (t.product || "Unknown") === data.name, `Tasks for Product: ${data.name}`)
                }
              >
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
                cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                label={({ name, value }) => `${name}: ${value}`}
                onClick={(data) =>
                  showTasks((t) => (t.priority || "Unknown") === data.name, `Tasks with Priority: ${data.name}`)
                }
              >
                {byPriority.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip /><Legend wrapperStyle={{ fontSize: "0.8rem" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Line Chart → Over Time */}
        <Card title="Tasks Created Over Time">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={byDate}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#444" : "#ccc"} />
              <XAxis dataKey="date" stroke={darkMode ? "#ddd" : "#333"} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke={darkMode ? "#ddd" : "#333"} tick={{ fontSize: 12 }} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: "0.8rem" }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={darkMode ? "#63e6be" : "#00C49F"}
                strokeWidth={2}
                dot={{ r: 3 }}
                onClick={(data) =>
                  showTasks((t) => formatDate(t.created_at) === data.date, `Tasks on ${data.date}`)
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Stacked Bar Chart → Department × Status */}
        <Card title="Department vs Status">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={deptStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#444" : "#ccc"} />
              <XAxis dataKey="department" stroke={darkMode ? "#ddd" : "#333"} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke={darkMode ? "#ddd" : "#333"} tick={{ fontSize: 12 }} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: "0.8rem" }} />
              {statuses.map((st, i) => (
                <Bar key={st} dataKey={st} stackId="a" fill={COLORS[i % COLORS.length]}
                  onClick={(data) =>
                    showTasks(
                      (t) => (t.department || "Unknown") === data.department && (t.status || "Unknown") === st,
                      `Tasks in ${data.department} with Status: ${st}`
                    )
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Details Modal */}
      {selectedTasks.length > 0 && (
        <div className="details-modal">
          <div className="details-content">
            <button className="close-icon" onClick={closeModal}>✖</button>
            <h3>{detailTitle}</h3>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Product</th>
                  <th>Priority</th>
                  <th>Department</th>
                  <th>Assigned To</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {selectedTasks.map((t) => {
                  const profile = profileMap[t.assigned_to];
                  return (
                    <tr key={t.id}>
                      <td>{t.task_title || "(No title)"}</td>
                      <td>{t.status}</td>
                      <td>{t.product}</td>
                      <td>{t.priority}</td>
                      <td>{t.department}</td>
                      <td>{profile ? `${profile.name} (${profile.dept || "No Dept"})` : "Unknown"}</td>
                      <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// --- Main Page ---
export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("overall");
  const [selectedUser, setSelectedUser] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState("");

useEffect(() => {
  (async () => {
    try {
      // 1. Get logged-in user
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data?.user) throw new Error("No logged-in user found");
      const userId = data.user.id;

      // 2. Get profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, department, role")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) throw new Error("Profile not found for current user");

      setCurrentUser(profileData);
      setRole(profileData.role || "user");

      const isPrivileged = ["admin", "manager", "team_leader"].includes(profileData.role);

      // 3. Fetch tasks
      let taskQuery = supabase.from("tasks").select("*");
      if (!isPrivileged) taskQuery = taskQuery.eq("assigned_to", userId);
      const { data: taskData, error: taskError } = await taskQuery;
      if (taskError) throw taskError;

      // 4. Fetch all profiles (needed for modal display)
      const { data: profileList, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, department");

      if (profilesError) throw profilesError;

      setTasks(taskData || []);
      setProfiles(profileList || []);
    } catch (err) {
      console.error("❌ Dashboard fetch error:", err.message, err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  })();
}, []);


  // theme persistence
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
      document.body.setAttribute("data-theme", savedTheme);
    }
  }, []);
  useEffect(() => {
    const theme = darkMode ? "dark" : "light";
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [darkMode]);

  const profileMap = useMemo(() => {
    return Object.fromEntries(
      profiles.map(p => [p.id, { name: p.full_name, dept: p.department }])
    );
  }, [profiles]);

  // user options for react-select
  const userOptions = [
    { value: "", label: "All Users" },
    ...profiles.map(p => ({
      value: p.id,
      label: `${p.full_name} (${p.department || "No Dept"})`,
    })),
  ];

  // filter tasks by user
  const personTasks = selectedUser
    ? tasks.filter(t => t.assigned_to === selectedUser)
    : tasks;

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!tasks.length) return <p>No tasks available yet.</p>;

  const isPrivileged = ["admin", "manager", "team_leader"].includes(role);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>

      {/* If privileged → show tabs */}
      {isPrivileged ? (
        <>
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === "overall" ? "active" : ""}`}
              onClick={() => setActiveTab("overall")}
            >
              Overall
            </button>
            <button
              className={`tab-btn ${activeTab === "individual" ? "active" : ""}`}
              onClick={() => setActiveTab("individual")}
            >
              Individual
            </button>
          </div>

          {/* Overall */}
          {activeTab === "overall" && (
            <DashboardCharts tasks={tasks} darkMode={darkMode} profileMap={profileMap} />
          )}

          {/* Individual */}
          {activeTab === "individual" && (
            <div>
              <div className="user-select">
                <label>Select User: </label>
                <Select
                  className="user-dropdown"
                  classNamePrefix="react-select"
                  options={userOptions}
                  value={userOptions.find(opt => opt.value === selectedUser) || userOptions[0]}
                  onChange={(opt) => setSelectedUser(opt.value)}
                  isSearchable
                  placeholder="Search or select user..."
                />
              </div>
              {personTasks.length > 0 ? (
                <DashboardCharts tasks={personTasks} darkMode={darkMode} profileMap={profileMap} />
              ) : (
                <p>Please select a user to see their dashboard.</p>
              )}
            </div>
          )}
        </>
      ) : (
        // Normal user → only own dashboard
        <DashboardCharts tasks={tasks} darkMode={darkMode} profileMap={profileMap} />
      )}
    </div>
  );
}

// --- Reusable Card ---
function Card({ title, children }) {
  return (
    <div className="dashboard-card">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
}
