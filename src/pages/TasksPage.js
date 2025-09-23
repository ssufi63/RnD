// src/pages/TasksPage.js
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";

export default function TasksPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
      <TaskForm />
      <TaskList />
    </div>
  );
}
