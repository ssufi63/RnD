/* // src/pages/AllTasks.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import TaskTable from "../components/TaskTable";
import useUserProfile from "../hooks/useUserProfile";

export default function AllTasks() {
  const { session, profile } = useUserProfile();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAllTasks() {
    setLoading(true);
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (error) console.error(error);
    else setTasks(data || []);
    setLoading(false);
  }

  useEffect(() => { loadAllTasks(); }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>All Tasks (view only)</h1>
      <TaskTable tasks={tasks} canEdit={false} currentUserId={session?.user?.id} currentUserRole={profile?.role} onTasksChange={setTasks} loading={loading} />
    </div>
  );
}
 */