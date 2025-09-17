// src/App.js
import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

// Pages & Components
import Home from "./pages/Home";
import Dashboard from "./components/Dashboard";
import AssignTask from "./components/Assigntask";
import MyTasks from "./pages/MyTasks";
import AllTasks from "./pages/AllTasks";
import DashboardPage from "./pages/DashboardPage";
import TeamOverview from "./components/TeamOverview";
import Navbar from "./components/Navbar"; // ✅ use external navbar

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

  useEffect(() => {
    const fetchUserAndRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        // ✅ Fetch from `user_with_role` view (created earlier)
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

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchUserAndRole();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
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
              <ProtectedRoute
                user={user}
                role={role}
                allowedRoles={["admin", "team_leader", "manager"]} // ✅ expanded
              >
                <AssignTask />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
