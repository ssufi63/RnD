import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./../styles/navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserAndRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUser.id)
          .single();

        if (!error && data) setUserRole(data.role);
      }
    };

    fetchUserAndRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="navbar">
      {/* Left side */}
      <div className="navbar-left">
        <div className="logo">Task Manager</div>

        {/* Burger */}
        <div
          className={`burger ${menuOpen ? "toggle" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <div className="line1"></div>
          <div className="line2"></div>
          <div className="line3"></div>
        </div>
      </div>

      {/* Nav links */}
      <ul className={`nav-links ${menuOpen ? "open" : ""}`}>
        {user && (
          <li>
            <Link to="/summary" onClick={() => setMenuOpen(false)}>
              Dashboard
            </Link>
          </li>
        )}
        {user && (
          <li>
            <Link to="/mytasks" onClick={() => setMenuOpen(false)}>
              My Tasks
            </Link>
          </li>
        )}
        {user && (userRole === "admin" || userRole === "leader") && (
          <li>
            <Link to="/assigntasks" onClick={() => setMenuOpen(false)}>
              Assign Tasks
            </Link>
          </li>
        )}
        {user && (
          <li>
            <button onClick={handleLogout}>Logout</button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
