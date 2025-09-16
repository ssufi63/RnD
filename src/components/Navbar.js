// src/components/Navbar.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaTasks,
  FaHome,
  FaTachometerAlt,
  FaUsers,
  FaPlus,
  FaSignOutAlt,
  FaUserCircle,
} from "react-icons/fa";
import "./../styles/navbar.css";

const Navbar = ({ user, role, userName, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="logo">
        <FaTasks style={{ marginRight: "8px" }} />
        Task Manager
      </div>

      {/* Burger (mobile only) */}
      <div
        className={`burger ${menuOpen ? "toggle" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <div className="line1"></div>
        <div className="line2"></div>
        <div className="line3"></div>
      </div>

      {/* Nav links */}
      <ul className={`nav-links ${menuOpen ? "open" : ""}`}>
        <li>
          <Link to="/" onClick={() => setMenuOpen(false)}>
            <FaHome /> Home
          </Link>
        </li>

        {user && (
          <>
            <li>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
                <FaTachometerAlt /> Dashboard
              </Link>
            </li>
            <li>
              <Link to="/overview" onClick={() => setMenuOpen(false)}>
                <FaUsers /> Overview
              </Link>
            </li>
            {(role === "admin" || role === "leader") && (
              <li>
                <Link to="/assign" onClick={() => setMenuOpen(false)}>
                  <FaPlus /> Assign Task
                </Link>
              </li>
            )}
            <li>
              <Link to="/tasks" onClick={() => setMenuOpen(false)}>
                <FaTasks /> My Tasks
              </Link>
            </li>
            <li className="user-info">
              <FaUserCircle size={20} />
              <span>{userName || user.email}</span>
              <button onClick={onLogout}>
                <FaSignOutAlt /> Logout
              </button>
            </li>
          </>
        )}
      </ul>

      {/* Backdrop when menu is open */}
      {menuOpen && (
        <div
          className="backdrop"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}
    </nav>
  );
};

export default Navbar;
