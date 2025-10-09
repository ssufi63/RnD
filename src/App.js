// src/App.js
import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

// 🔹 Pages & Components
import Home from "./pages/Home";
import Dashboard from "./components/Dashboard";
import AssignTask from "./components/Assigntask";
import MyTasks from "./pages/MyTasks";
import AllTasks from "./pages/AllTasks";
import DashboardPage from "./pages/DashboardPage";
import TeamOverview from "./components/TeamOverview";
import Navbar from "./components/Navbar";
/* import ProjectBoard from "./components/ProjectBoard"; */
import Reset from "./pages/Reset";
import DateChangeRequests from "./components/DateChangeRequests";
/* import ProjectsBoardPage from "./pages/ProjectsBoardPage"; */
import ProjectsBoardPage from "./pages/ProjectsBoardPage";


// ✅ ProtectedRoute wrapper
const ProtectedRoute = ({ user, role, allowedRoles, children }) => {
  if (!user) return <p style={{ textAlign: "center" }}>Please log in</p>;
  if (allowedRoles && !allowedRoles.includes(role))
    return <p style={{ textAlign: "center" }}>Access denied</p>;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  // ✅ Auth + role fetch
  useEffect(() => {
    const fetchUserAndRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        // ✅ Fetch from `user_with_role` view
        const { data, error } = await supabase
          .from("user_with_role")
          .select("full_name, role")
          .eq("id", currentUser.id)
          .single();

        if (!error && data) {
          setRole(data.role || "user");
          setUserName(data.full_name || currentUser.email || "");
        } else {
          console.error("Error fetching role:", error);
          setRole("user");
          setUserName(currentUser.email || "");
        }
      } else {
        setRole(null);
        setUserName("");
      }
    };

    fetchUserAndRole();

    // ✅ Re-run when session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUserAndRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setUserName("");
    navigate("/");
  };

  return (
    <div>
      <Navbar
        user={user}
        role={role}
        userName={userName}
        onLogout={handleLogout}
      />

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reset" element={<Reset />} />

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

          {/* ✅ Main new Projects Board (Kanban system) */}
          <Route
            path="/projectsboard"
            element={
              <ProtectedRoute user={user} role={role}>
                <ProjectsBoardPage role={role} />
              </ProtectedRoute>
            }
          />

          {/* ✅ Assign Task restricted to admins, team_leader, manager */}
          <Route
            path="/assign"
            element={
              <ProtectedRoute
                user={user}
                role={role}
                allowedRoles={["admin", "team_leader", "manager"]}
              >
                <AssignTask />
              </ProtectedRoute>
            }
          />

          {/* ✅ Date Change Request restricted */}
          <Route
            path="/change-request" // changed route to avoid space in URL
            element={
              <ProtectedRoute
                user={user}
                role={role}
                allowedRoles={["admin", "team_leader", "manager"]}
              >
                <DateChangeRequests />
              </ProtectedRoute>
            }
          />

          {/* ✅ Legacy Projects List */}
      {/*     <Route
            path="/projects"
            element={
              <ProtectedRoute
                user={user}
                role={role}
                allowedRoles={["admin", "team_leader", "manager"]}
              >
                <ProjectBoard role={role} />
              </ProtectedRoute>
            }
          /> */}
        </Routes>
      </div>
    </div>
  );
}

export default App;
