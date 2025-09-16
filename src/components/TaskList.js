import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./TaskList.css"; // ✅ external styles

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

    // INSERTS
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "tasks" },
      (payload) => {
        const row = payload.new;
        if (!belongsToUser(row, userId)) return;
        setTasks((prev) => {
          if (prev.some((t) => t.id === row.id)) return prev;
          return [row, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
      }
    );

    // UPDATES
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

    // DELETES
    channel.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "tasks" },
      (payload) => {
        const oldRow = payload.old;
        setTasks((prev) => prev.filter((t) => t.id !== oldRow.id));
      }
    );

    channel.subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId]);

  if (loading) return <div className="tasklist-loading">Loading tasks…</div>;

  if (!tasks.length) {
    return (
      <div className="tasklist-container">
        <h2 className="tasklist-title">My Tasks</h2>
        <div className="tasklist-empty">No tasks yet. Create one above!</div>
      </div>
    );
  }

  return (
    <div className="tasklist-container">
      <h2 className="tasklist-title">My Tasks</h2>
      <ul className="tasklist-list">
        {tasks.map((task) => (
          <li key={task.id} className="tasklist-item">
            <div className="tasklist-header">
              <strong>{task.task_title}</strong>
              <span className={`badge status-${task.status.replace(/\s+/g, "").toLowerCase()}`}>
                {task.status}
              </span>
            </div>
            <div className="tasklist-meta">
              <span className={`badge priority-${task.priority.toLowerCase()}`}>
                {task.priority}
              </span>
              {task.product && <span> • {task.product}</span>}
              {task.task_type && <span> • {task.task_type}</span>}
            </div>
            <div className="tasklist-dates">
              {task.start_date && <span>Start: {task.start_date}</span>}
              {task.deadline && <span> • Deadline: {task.deadline}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
