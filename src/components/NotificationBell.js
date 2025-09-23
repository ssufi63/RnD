import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {FaBell} from "react-icons/fa";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id;
      if (!userId) return;
      setUid(userId);

      // Load notifications
      await loadNotifications(userId);

      // Subscribe to realtime changes (optional, live updates!)
      const channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };
    init();
  }, []);

  const loadNotifications = async (userId) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error) setNotifications(data || []);
    setLoading(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (!uid) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", uid)
      .eq("is_read", false);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
  };

  if (loading) return null;

  return (
    <div style={{ position: "relative", marginRight: "20px" }}>
      <button
        style={{ fontSize: "20px", cursor: "pointer", position: "relative" }}
        onClick={() => setOpen(!open)}
      >
        <FaBell/>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              background: "red",
              color: "white",
              borderRadius: "50%",
              padding: "2px 6px",
              fontSize: "12px",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "30px",
            right: 0,
            width: "300px",
            maxHeight: "400px",
            overflowY: "auto",
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "8px",
            boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px",
              borderBottom: "1px solid #eee",
            }}
          >
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize: "12px",
                  background: "none",
                  border: "none",
                  color: "blue",
                  cursor: "pointer",
                }}
              >
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p style={{ padding: "10px" }}>No notifications</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #eee",
                  background: n.is_read ? "white" : "#f0f8ff",
                }}
              >
                <p style={{ margin: 0 }}>{n.message}</p>
                <small style={{ color: "gray" }}>
                  {new Date(n.created_at).toLocaleString()}
                </small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
