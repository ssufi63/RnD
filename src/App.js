// src/App.js
import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

// ✅ Icons
import { FaHome, FaTachometerAlt, FaUsers, FaTasks, FaPlus, FaSignOutAlt, FaUserCircle } from "react-icons/fa";

// Pages
import Home from "./pages/Home";
import Dashboard from "./components/Dashboard";
import AssignTask from "./components/Assigntask";
import MyTasks from "./pages/MyTasks";
import AllTasks from "./pages/AllTasks";
import DashboardPage from "./pages/DashboardPage";
import TeamOverview from "./components/TeamOverview";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// ✅ ProtectedRoute wrapper
const ProtectedRoute = ({ user, role, allowedRoles, children }) => {
  if (!user) {
    return <p style={{ textAlign: "center" }}>Please log in</p>;
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <p style={{ textAlign: "center" }}>Access denied</p>;
  }
  return children;
};

// ✅ Navbar with icons
function Navbar({ user, role, userName, onLogout }) {
  return (
    <nav style={styles.navbar}>
      {/* Logo */}
      <div style={styles.logo}>
        <FaTasks style={{ marginRight: "8px" }} />
        Task Manager
      </div>

      {/* Links */}
      <div style={styles.links}>
        <Link to="/" style={styles.link}><FaHome /> Home</Link>

   {/*      {!user && (
          <>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/signup" style={styles.link}>Signup</Link>
          </>
        )} */}

        {user && (
          <>
            <Link to="/dashboard" style={styles.link}><FaTachometerAlt /> Dashboard</Link>
            <Link to="/overview" style={styles.link}><FaUsers /> Overview</Link>
            {(role === "admin" || role === "leader") && (
              <Link to="/assign" style={styles.link}><FaPlus /> Assign Task</Link>
            )}
            <Link to="/tasks" style={styles.link}><FaTasks /> My Tasks</Link>
          </>
        )}
      </div>

      {/* User info */}
      {user && (
        <div style={styles.userSection}>
          <FaUserCircle size={24} color="#fff" />
          <span style={styles.userName}>{userName || user.email}</span>
          <button onClick={onLogout} style={styles.logoutBtn}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      )}
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  // 🔹 Fetch session + role + name
  useEffect(() => {
    const fetchUserAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", currentUser.id)
          .single();

        setRole(data?.role || null);
        setUserName(data?.full_name || currentUser.email || "");
      } else {
        setRole(null);
        setUserName("");
      }
    };

    fetchUserAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchUserAndRole();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 🔹 Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setUserName("");
    navigate("/");
  };

  return (
    <div>
      <Navbar user={user} role={role} userName={userName} onLogout={handleLogout} />
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          {/* <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} /> */}

          {/* Protected routes */}
          <Route
            path="/overview"
            element={
              <ProtectedRoute user={user} role={role}>
                <TeamOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute user={user} role={role}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user} role={role}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alltasks"
            element={
              <ProtectedRoute user={user} role={role}>
                <AllTasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assign"
            element={
              <ProtectedRoute user={user} role={role} allowedRoles={["admin", "leader"]}>
                <AssignTask />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

// 🎨 Styles
const styles = {
  navbar: {
    position: "sticky",       // ✅ stays on top
    top: 0,                   // ✅ sticks to the top edge
    zIndex: 1000,             // ✅ ensures it’s above other elements
    padding: "12px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(135deg, #007bff, #00c6ff)",
    color: "#fff",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    fontSize: "20px",
    fontWeight: "700",
    color: "#fff",
  },
  links: {
    display: "flex",
    gap: "18px",
    alignItems: "center",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#fff",
    textDecoration: "none",
    fontWeight: "500",
    transition: "color 0.2s",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userName: {
    fontWeight: "600",
    fontSize: "15px",
  },
  logoutBtn: {
    background: "#dc3545",
    border: "none",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
};

export default App;
