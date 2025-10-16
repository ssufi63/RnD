import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./TaskFiltersSidebar.css";
import { supabase } from "../supabaseClient";

export default function TaskFiltersSidebar({ onFilterChange }) {
  const [collapsed, setCollapsed] = useState(false);

  // Filter states
  const [dateContext, setDateContext] = useState("deadline");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [department, setDepartment] = useState("");
  const [product, setProduct] = useState("");
  const [project, setProject] = useState("");
  const [assignee, setAssignee] = useState("");
  const [quick, setQuick] = useState("");

  // Dropdown data
  const [departments, setDepartments] = useState([]);
  const [products, setProducts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assignees, setAssignees] = useState([]);

  // Load dropdown options from Supabase
  useEffect(() => {
    const loadOptions = async () => {
      const [taskRes, profileRes, projRes] = await Promise.all([
        supabase.from("tasks").select("product, department").order("product"),
        supabase.from("profiles").select("id, full_name, department").order("full_name"),
        supabase.from("projects").select("project_id, project_name").order("project_name"),
      ]);

      if (taskRes.data) {
        const products = [...new Set(taskRes.data.map((t) => t.product).filter(Boolean))];
        const departments = [...new Set(taskRes.data.map((t) => t.department).filter(Boolean))];
        setProducts(products);
        setDepartments(departments);
      }

      if (profileRes.data) setAssignees(profileRes.data);
      if (projRes.data) setProjects(projRes.data);
    };
    loadOptions();
  }, []);

  // Handle apply
  const handleApply = () => {
    onFilterChange({
      dateContext,
      startDate,
      endDate,
      status,
      priority,
      department,
      product,
      project,
      assignee,
      quick,
    });
  };

  // Handle reset
  const handleReset = () => {
    setDateContext("deadline");
    setStartDate(null);
    setEndDate(null);
    setStatus("");
    setPriority("");
    setDepartment("");
    setProduct("");
    setProject("");
    setAssignee("");
    setQuick("");
    onFilterChange({});
  };

  return (
    <div className={`filterSidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Collapse/Expand Button */}
      <button
        className={`collapseBtn ${collapsed ? "collapsedBtn" : ""}`}
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand Filters" : "Collapse Filters"}
        title={collapsed ? "Expand Filters" : "Collapse Filters"}
      >
        <svg
          className="chevronIcon"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="filterContent">
          <h3>🔍 Filters</h3>

          {/* --- Date Context --- */}
          <div className="filterSection">
            <label>Date Context</label>
            <select value={dateContext} onChange={(e) => setDateContext(e.target.value)}>
              <option value="start_date">Start Date</option>
              <option value="deadline">Deadline</option>
              <option value="completion_date">Completion Date</option>
              <option value="created_at">Created At</option>
            </select>
          </div>

          {/* --- Date Range --- */}
          <div className="filterSection">
            <label>Date Range</label>
            <div className="dateRange">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Start"
                dateFormat="yyyy-MM-dd"
              />
              <span>→</span>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                placeholderText="End"
                dateFormat="yyyy-MM-dd"
              />
            </div>
          </div>

          {/* --- Status --- */}
          <div className="filterSection">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* --- Product --- */}
          <div className="filterSection">
            <label>Product</label>
            <select value={product} onChange={(e) => setProduct(e.target.value)}>
              <option value="">All</option>
              {products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* --- Quick Filters --- */}
          <div className="filterSection">
            <label>Quick Filters</label>
            <div className="quickButtons">
              {["Overdue", "Upcoming (7d)", "Completed Recently"].map((opt) => (
                <button
                  key={opt}
                  className={quick === opt ? "active" : ""}
                  onClick={() => setQuick(quick === opt ? "" : opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* --- Actions --- */}
          <div className="filterActions">
            <button className="applyBtn" onClick={handleApply}>
              Apply
            </button>
            <button className="resetBtn" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
