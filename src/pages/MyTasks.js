/* // src/pages/MyTasks.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import TaskForm from "../components/TaskForm";
import TaskTable from "../components/TaskTable";
import useUserProfile from "../hooks/useUserProfile";

export default function MyTasks() {
  const { session, profile, loading: userLoading } = useUserProfile();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadMyTasks() {
    setLoading(true);
    if (!session) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const userId = session.user.id;
    const { data, error } = await supabase.from("tasks").select("*").eq("created_by", userId).order("created_at", { ascending: false });
    if (error) console.error(error);
    else setTasks(data || []);
    setLoading(false);
  }

  useEffect(() => { loadMyTasks(); }, [session]);

  return (
    <div style={{ padding: 20 }}>
      <h1>My Tasks</h1>
      <TaskForm onTaskCreated={(t) => setTasks(prev => [t, ...prev])} />
      <hr style={{ margin: "20px 0" }} />
      <TaskTable tasks={tasks} canEdit={true} currentUserId={session?.user?.id} currentUserRole={profile?.role} onTasksChange={setTasks} loading={loading} />
    </div>
  );
}
 */