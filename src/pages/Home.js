// src/pages/Home.js
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function Home() {
  const navigate = useNavigate();
  // Disable scroll only on Home
useEffect(() => {
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = "auto"; // restore for other pages
  };
}, []);
  // ---------------- Auth & UI state ----------------
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [quotes, setQuotes] = useState([]);
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Auth form states
  const [activeTab, setActiveTab] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const [signupForm, setSignupForm] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
    department: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });
  const [signupError, setSignupError] = useState("");
  const [signingUp, setSigningUp] = useState(false);

  // ---------------- Helpers ----------------
  const resolveCurrentUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser?.();
      if (!error && data?.user) return data.user;
    } catch (_) {}

    try {
      const { data, error } = await supabase.auth.getSession?.();
      if (!error && data?.session?.user) return data.session.user;
    } catch (_) {}

    return null;
  };

  // ---------------- Boot: read session + subscribe ----------------
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const current = await resolveCurrentUser();
      if (isMounted) {
        setUser(current);
        setLoading(false);
      }
    })();

    const { data: listener } =
      supabase.auth.onAuthStateChange?.((_event, session) => {
        setUser(session?.user || null);
      }) || { data: null };

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
      listener?.unsubscribe?.();
    };
  }, []);

  // ---------------- Load quotes after login ----------------
  useEffect(() => {
    const fetchQuotes = async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("text")
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data)) setQuotes(data);
    };

    if (user) fetchQuotes();
  }, [user]);

  // Rotate quotes every 5s
  useEffect(() => {
    if (!user || quotes.length === 0) return;
    const id = setInterval(
      () => setQuoteIndex((i) => (i + 1) % quotes.length),
      5000
    );
    return () => clearInterval(id);
  }, [user, quotes]);

  // ---------------- Form handlers ----------------
  const handleLoginChange = (e) =>
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  const handleSignupChange = (e) =>
    setSignupForm({ ...signupForm, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });

    if (error) {
      setLoginError(error.message);
      return;
    }

    const role = data.user?.user_metadata?.role;
    if (role === "team_leader") {
      navigate("/dashboard");
    } else {
      navigate("/tasks");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError("");

    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupError("Passwords do not match");
      return;
    }

    setSigningUp(true);

    const { error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        data: {
          first_name: signupForm.firstName,
          last_name: signupForm.lastName,
          full_name: `${signupForm.firstName} ${signupForm.lastName}`,
          employee_id: signupForm.employeeId,
          department: signupForm.department,
          role: signupForm.role,
        },
      },
    });

    setSigningUp(false);

    if (error) {
      setSignupError(error.message);
      return;
    }

    alert("Signup successful! Please check your email to confirm.");
    setActiveTab("login");
  };

  // ---------------- UI ----------------

  if (loading) {
    return (
      <div style={styles.fullPage}>
        <div style={styles.spinner} />
      </div>
    );
  }

  // Logged-in → Quotes carousel
  if (user) {
    return (
      <div style={styles.loggedInWrap}>
        <AnimatePresence mode="wait">
          <motion.div
            key={quoteIndex}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8 }}
            style={styles.quoteCard}
          >
            <p style={styles.quoteText}>
              “{quotes[quoteIndex]?.text || "Loading inspiration..."}”
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Logged-out → Auth forms
  return (
    <div style={styles.authPage}>
      {/* Left Branding Panel */}
      <div style={styles.leftPanel}>
        <h1 style={styles.brand}>Task Manager</h1>
        <p style={styles.tagline}>
          “The secret of getting ahead is getting started.”
        </p>
        <p style={styles.footer}>© {new Date().getFullYear()} RFL Electronics Ltd.</p>
      </div>

      {/* Right Auth Panel */}
      <div style={styles.rightPanel}>
        <div style={styles.tabsWrapper}>
          <button
            style={{ ...styles.tab, ...(activeTab === "login" ? styles.activeTab : {}) }}
            onClick={() => setActiveTab("login")}
          >
            🔑 Login
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === "signup" ? styles.activeTab : {}) }}
            onClick={() => setActiveTab("signup")}
          >
            📝 Signup
          </button>
        </div>

        <div style={styles.content}>
          <AnimatePresence mode="wait">
            {activeTab === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <form style={styles.form} onSubmit={handleLogin}>
                  <h2 style={styles.formTitle}>Login</h2>
                  {loginError && <p style={styles.error}>{loginError}</p>}

                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={loginForm.email}
                    onChange={handleLoginChange}
                    style={styles.inputFull}
                    required
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    style={styles.inputFull}
                    required
                  />

                  <button type="submit" style={styles.submitButton}>
                    Login
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === "signup" && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <form style={styles.form} onSubmit={handleSignup}>
                  <h2 style={styles.formTitle}>Signup</h2>
                  {signupError && <p style={styles.error}>{signupError}</p>}

                  <div style={styles.row}>
                    <input
                      name="firstName"
                      placeholder="First Name"
                      value={signupForm.firstName}
                      onChange={handleSignupChange}
                      style={styles.input}
                      required
                    />
                    <input
                      name="lastName"
                      placeholder="Last Name"
                      value={signupForm.lastName}
                      onChange={handleSignupChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.row}>
                    <input
                      name="employeeId"
                      placeholder="Employee ID"
                      value={signupForm.employeeId}
                      onChange={handleSignupChange}
                      style={styles.input}
                      required
                    />
                    <input
                      name="department"
                      placeholder="Department"
                      value={signupForm.department}
                      onChange={handleSignupChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={signupForm.email}
                    onChange={handleSignupChange}
                    style={styles.inputFull}
                    required
                  />

                  <div style={styles.row}>
                    <input
                      type="password"
                      name="password"
                      placeholder="Password"
                      value={signupForm.password}
                      onChange={handleSignupChange}
                      style={styles.input}
                      required
                    />
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      value={signupForm.confirmPassword}
                      onChange={handleSignupChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <button type="submit" style={styles.submitButton} disabled={signingUp}>
                    {signingUp ? "Signing Up..." : "Sign Up"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ---------------- Styles ----------------
const styles = {
  fullPage: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f9f9f9",
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "4px solid #e5e7eb",
    borderTopColor: "#0d6efd",
    animation: "spin 0.8s linear infinite",
  },

  // Logged-in
  loggedInWrap: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #113bff, #00c6ff)",
    overflow: "hidden",
  },
  quoteCard: {
    background: "rgba(255,255,255,0.15)",
    padding: "40px 60px",
    borderRadius: "20px",
    backdropFilter: "blur(10px)",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    maxWidth: "700px",
    textAlign: "center",
  },
  quoteText: {
    fontSize: "2.3rem",
    fontWeight: "500",
    color: "#fff",
    lineHeight: "1.6",
    fontStyle: "italic",
  },

  // Logged-out
  authPage: {
    display: "flex",
    height: "93vh",
    width: "100vw",
    fontFamily: "Inter, Arial, sans-serif",
    overflow: "hidden",
  },
  leftPanel: {
    flex: 1,
    background: "linear-gradient(135deg, #007bff, #00c6ff)",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
    textAlign: "center",
  },
  brand: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  tagline: {
    fontSize: "1.2rem",
    fontStyle: "italic",
    maxWidth: "300px",
    lineHeight: "1.5",
  },
  footer: {
    marginTop: "auto",
    fontSize: "0.9rem",
    opacity: 0.8,
  },
  rightPanel: {
    flex: 1.2,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "40px",
    background: "#f9f9f9",
  },
  tabsWrapper: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  tab: {
    padding: "10px 20px",
    borderRadius: "25px",
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    color: "#333",
    minWidth: "120px",
  },
  activeTab: {
    background: "linear-gradient(135deg, #007bff, #00c6ff)",
    color: "#fff",
    border: "1px solid #007bff",
    fontWeight: "600",
  },
  content: {
    padding: "20px",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  row: {
    display: "flex",
    gap: "15px",
  },
  formTitle: { textAlign: "center", color: "#0d6efd" },
  error: { color: "red", textAlign: "center" },
  input: {
    flex: "1 1 0",
    height: 44,
    padding: "8px 12px",
    fontSize: 15,
    borderRadius: 8,
    border: "1px solid #ccc",
    boxSizing: "border-box",
  },
  inputFull: {
    width: "100%",
    height: 44,
    padding: "8px 12px",
    fontSize: 15,
    borderRadius: 8,
    border: "1px solid #ccc",
    boxSizing: "border-box",
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

export default Home;
