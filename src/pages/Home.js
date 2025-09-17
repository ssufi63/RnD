// src/pages/Home.js
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./Home.css";
import "./Home.css?v=2";


function Home() {
  const navigate = useNavigate();

  // Disable scroll only on Home
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto"; // restore
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Auth states
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

  // Resolve current user
  const resolveCurrentUser = async () => {
    try {
      const { data } = await supabase.auth.getUser?.();
      if (data?.user) return data.user;
    } catch (_) {}
    try {
      const { data } = await supabase.auth.getSession?.();
      if (data?.session?.user) return data.session.user;
    } catch (_) {}
    return null;
  };

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

  // Fetch quotes after login
  useEffect(() => {
    const fetchQuotes = async () => {
      const { data } = await supabase.from("quotes").select("text").order("created_at", { ascending: true });
      if (Array.isArray(data)) setQuotes(data);
    };
    if (user) fetchQuotes();
  }, [user]);

  // Rotate quotes
  useEffect(() => {
    if (!user || quotes.length === 0) return;
    const id = setInterval(() => setQuoteIndex((i) => (i + 1) % quotes.length), 5000);
    return () => clearInterval(id);
  }, [user, quotes]);

  // Handlers
  const handleLoginChange = (e) =>
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  const handleSignupChange = (e) =>
    setSignupForm({ ...signupForm, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword(loginForm);
    if (error) return setLoginError(error.message);
    const role = data.user?.user_metadata?.role;
    navigate(role === "team_leader" ? "/dashboard" : "/tasks");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError("");
    if (signupForm.password !== signupForm.confirmPassword) {
      return setSignupError("Passwords do not match");
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
    if (error) return setSignupError(error.message);
    alert("Signup successful! Please check your email.");
    setActiveTab("login");
  };

  if (loading) {
    return (
      <div className="fullPage">
        <div className="spinner" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="loggedInWrap">
        <AnimatePresence mode="wait">
          <motion.div
            key={quoteIndex}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8 }}
            className="quoteCard"
          >
            <p className="quoteText">
              “{quotes[quoteIndex]?.text || "Loading inspiration..."}”
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="authPage">
      <div className="leftPanel">
        <h1 className="brand">Task Manager</h1>
        <p className="tagline">“The secret of getting ahead is getting started.”</p>
        <p className="footer">© {new Date().getFullYear()} RFL Electronics Ltd.</p>
      </div>

      <div className="rightPanel">
        <div className="tabsWrapper">
          <button
            className={`tab ${activeTab === "login" ? "activeTab" : ""}`}
            onClick={() => setActiveTab("login")}
          >
            🔑 Login
          </button>
          <button
            className={`tab ${activeTab === "signup" ? "activeTab" : ""}`}
            onClick={() => setActiveTab("signup")}
          >
            📝 Signup
          </button>
        </div>

        <div className="content">
          <AnimatePresence mode="wait">
            {activeTab === "login" && (
              <motion.div key="login" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
                <form className="form loginForm" onSubmit={handleLogin}>
                  <h2 className="formTitle">Login</h2>
                  {loginError && <p className="error">{loginError}</p>}
                  <input type="email" name="email" placeholder="Email" value={loginForm.email} onChange={handleLoginChange} required />
                  <input type="password" name="password" placeholder="Password" value={loginForm.password} onChange={handleLoginChange} required />
                  <button type="submit" className="submitButton">Login</button>
                </form>
              </motion.div>
            )}

            {activeTab === "signup" && (
              <motion.div key="signup" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <form className="form formGrid" onSubmit={handleSignup}>
                  <h2 className="formTitle">Signup</h2>
                  {signupError && <p className="error">{signupError}</p>}

                  <div className="row">
                    <input name="firstName" placeholder="First Name" value={signupForm.firstName} onChange={handleSignupChange} required />
                    <input name="lastName" placeholder="Last Name" value={signupForm.lastName} onChange={handleSignupChange} required />
                  </div>

                  <div className="row">
                    <input name="employeeId" placeholder="Employee ID" value={signupForm.employeeId} onChange={handleSignupChange} required />
                    <input name="department" placeholder="Department" value={signupForm.department} onChange={handleSignupChange} required />
                  </div>

                  <input type="email" name="email" placeholder="Email" value={signupForm.email} onChange={handleSignupChange} required />

                  <div className="row">
                    <input type="password" name="password" placeholder="Password" value={signupForm.password} onChange={handleSignupChange} required />
                    <input type="password" name="confirmPassword" placeholder="Confirm Password" value={signupForm.confirmPassword} onChange={handleSignupChange} required />
                  </div>

                  <button type="submit" className="submitButton" disabled={signingUp}>
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

export default Home;
