// src/components/DateChangeRequests.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function DateChangeRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("member");

  useEffect(() => {
    const init = async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) return;

      // fetch role
      const { data: roleRow } = await supabase
        .from("user_with_role")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      const r = roleRow?.role || "member";
      setRole(r);

      if (["team_leader", "manager", "admin"].includes(r)) {
        const { data, error } = await supabase
          .from("task_date_change_requests")
          .select(`
            id,
            task_id,
            requested_by,
            old_start_date,
            new_start_date,
            old_deadline,
            new_deadline,
            reason,
            created_at,
            rejection_reason,
            tasks (task_title)
          `)
          .eq("status", "Pending")
          .order("created_at", { ascending: true });

        if (!error) setRequests(data || []);
      }

      setLoading(false);
    };

    init();
  }, []);

  const refresh = async () => {
    const { data, error } = await supabase
      .from("task_date_change_requests")
      .select(`
        id,
        task_id,
        requested_by,
        old_start_date,
        new_start_date,
        old_deadline,
        new_deadline,
        reason,
        created_at,
        rejection_reason,
        tasks (task_title)
      `)
      .eq("status", "Pending")
      .order("created_at", { ascending: true });

    if (!error) setRequests(data || []);
  };

  const approve = async (req) => {
    const { error } = await supabase.rpc("approve_date_change_request", {
      p_request_id: req.id,
    });
    if (error) return alert("Approve failed: " + error.message);

    // Notify the member
    await supabase.from("notifications").insert({
      user_id: req.requested_by,
      message: `✅ Your request for task "${req.tasks?.task_title}" has been approved.`,
    });

    await refresh();
  };

  const reject = async (req) => {
    const reason = prompt("Please enter a reason for rejecting this request:");
    if (!reason) return; // Cancelled

    const { error } = await supabase.rpc("reject_date_change_request", {
      p_request_id: req.id,
    });
    if (error) return alert("Reject failed: " + error.message);

    // Save rejection reason (if RPC doesn’t already handle it)
    await supabase
      .from("task_date_change_requests")
      .update({ rejection_reason: reason })
      .eq("id", req.id);

    // Notify the member
    await supabase.from("notifications").insert({
      user_id: req.requested_by,
      message: `❌ Your request for task "${req.tasks?.task_title}" was rejected. Reason: ${reason}`,
    });

    await refresh();
  };

  if (loading) return <p>Loading…</p>;
  if (!["team_leader", "manager", "admin"].includes(role)) {
    return (
      <p style={{ textAlign: "center" }}>
        You don’t have permission to view approvals.
      </p>
    );
  }
  if (!requests.length) return <p>No pending requests</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Pending Date Change Requests</h2>
      {requests.map((req) => (
        <div key={req.id} className="requestCard">
          <p>
            <b>Task:</b> {req.tasks?.task_title || "Untitled Task"}
          </p>
          <p>
            <b>Old Start:</b> {req.old_start_date || "-"} → <b>New:</b>{" "}
            {req.new_start_date || "-"}
          </p>
          <p>
            <b>Old Deadline:</b> {req.old_deadline || "-"} → <b>New:</b>{" "}
            {req.new_deadline || "-"}
          </p>
          <p>
            <b>Reason:</b> {req.reason || "-"}
          </p>
          <div>
            <button onClick={() => approve(req)}>✅ Approve</button>
            <button onClick={() => reject(req)}>❌ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
