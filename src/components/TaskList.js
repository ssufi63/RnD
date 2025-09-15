// src/components/TaskList.js
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const belongsToUser = (row, uid) => {
    if (!row || !uid) return false;
    return row.created_by === uid || row.assigned_to === uid;
  };

  // Initial fetch
  useEffect(() => {
    const fetchTasks = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      setUserId(uid);

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .or(`created_by.eq.${uid},assigned_to.eq.${uid}`)
        .order("created_at", { ascending: false });

      if (!error && data) setTasks(data || []);
      setLoading(false);
    };

    fetchTasks();
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`tasks-${userId}`);

    // INSERTS where current user is creator or assignee (2 filtered subscriptions)
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "tasks", filter: `created_by=eq.${userId}` },
      (payload) => {
        const row = payload.new;
        setTasks((prev) => {
          if (prev.some((t) => t.id === row.id)) return prev;
          return [row, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
      }
    );
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "tasks", filter: `assigned_to=eq.${userId}` },
      (payload) => {
        const row = payload.new;
        setTasks((prev) => {
          if (prev.some((t) => t.id === row.id)) return prev;
          return [row, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
      }
    );

    // UPDATES (subscribe broadly, then filter in client to be safe)
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "tasks" },
      (payload) => {
        const row = payload.new;
        if (!belongsToUser(row, userId)) return;
        setTasks((prev) =>
          prev.map((t) => (t.id === row.id ? row : t))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        );
      }
    );

    // DELETES (subscribe broadly; filter by presence in list)
    channel.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "tasks" },
      (payload) => {
        const oldRow = payload.old;
        setTasks((prev) => prev.filter((t) => t.id !== oldRow.id));
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) return <div style={styles.loading}>Loading tasks…</div>;

  if (!tasks.length) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>My Tasks</h2>
        <div style={styles.empty}>No tasks yet. Create one above!</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>My Tasks</h2>
      <ul style={styles.list}>
        {tasks.map((task) => (
          <li key={task.id} style={styles.item}>
            <div style={styles.rowLine}>
              <strong>{task.task_title}</strong>
              <span style={styles.badge}>{task.status}</span>
            </div>
            <div style={styles.sub}>
              <span>Priority: {task.priority}</span>
              {task.product ? <span> • Product: {task.product}</span> : null}
              {task.task_type ? <span> • Type: {task.task_type}</span> : null}
            </div>
            <div style={styles.sub2}>
              {task.start_date ? <span>Start: {task.start_date}</span> : null}
              {task.deadline ? <span> • Deadline: {task.deadline}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  loading: { maxWidth: 900, margin: "20px auto", padding: 16, color: "#555" },
  container: { marginTop: 30, padding: 20, background: "#f8f9fa", borderRadius: 12 },
  title: { marginBottom: 12, fontSize: 18, fontWeight: 600, color: "#0d6efd" },
  list: { listStyle: "none", padding: 0, margin: 0 },
  item: { padding: "12px 0", borderBottom: "1px solid #ddd" },
  rowLine: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  badge: { fontSize: 12, padding: "4px 8px", background: "#e7f1ff", color: "#0d6efd", borderRadius: 999 },
  sub: { fontSize: 13, color: "#555", marginTop: 4 },
  sub2: { fontSize: 12, color: "#777", marginTop: 2 }
};
