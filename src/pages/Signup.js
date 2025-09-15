// src/components/Signup.js
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
    department: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    // ✅ Only sign up in Auth (profiles row will be auto-created by trigger)
const { data, error } = await supabase.auth.signUp({
  email: form.email,
  password: form.password,
  options: {
    data: {
      firstName: form.firstName,
      lastName: form.lastName,
      full_name: `${form.firstName} ${form.lastName}`,
      employee_id: form.employeeId,
      department: form.department
    }
  }
});


    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    alert("Signup successful! Please check your email to confirm.");
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <h2 style={styles.title}>Sign Up</h2>
        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>First Name</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Last Name</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Employee ID</label>
            <input
              name="employeeId"
              value={form.employeeId}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Department</label>
            <input
              name="department"
              value={form.department}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
        </div>

        <div style={styles.fullRow}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            style={styles.inputFull}
            required
          />
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
        </div>

        <button type="submit" style={styles.submitButton} disabled={loading}>
          {loading ? "Signing Up..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}

// 🎨 Same design language as TaskForm.js
const styles = {
  container: {
    maxWidth: 900,
    margin: "40px auto",
    padding: 28,
    borderRadius: 14,
    background: "#fff",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  },
  form: { display: "flex", flexDirection: "column", gap: 24 },
  title: { textAlign: "center", color: "#0d6efd", marginBottom: 10 },
  error: { color: "red", textAlign: "center" },
  fullRow: { width: "100%", display: "flex", flexDirection: "column" },
  row: { display: "flex", flexWrap: "wrap", gap: 20 },
  field: { flex: "1 1 220px", display: "flex", flexDirection: "column" },
  label: { fontWeight: 600, fontSize: 15, color: "#0d6efd", marginBottom: 6 },
  input: {
    height: 44,
    padding: "8px 12px",
    fontSize: 15,
    borderRadius: 8,
    border: "1px solid #ccc",
    outline: "none",
  },
  inputFull: {
    height: 50,
    padding: "10px 14px",
    fontSize: 16,
    borderRadius: 8,
    border: "1px solid #ccc",
  },
  submitButton: {
    padding: "12px 20px",
    background: "linear-gradient(135deg,#007bff,#00c6ff)",
    color: "#fff",
    borderRadius: 10,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default Signup;
