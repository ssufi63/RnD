// src/pages/Reset.js
import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function Reset() {
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setLoading(false);

    if (error) {
      return setMessage(error.message);
    }

    setMessage("✅ Password updated successfully! Redirecting to login...");

    // Redirect back to login after 2 seconds
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 2000);
  };

  return (
    <div className="authPage">
      <form className="form" onSubmit={handleReset} style={{ maxWidth: "400px", margin: "auto" }}>
        <h2 className="formTitle">Set New Password</h2>
        {message && <p className={message.startsWith("✅") ? "info" : "error"}>{message}</p>}
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <button type="submit" className="submitButton" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default Reset;
