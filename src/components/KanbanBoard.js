import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { FaPlus } from "react-icons/fa";
import TaskFormModal from "./modals/TaskFormModal";
import AddMemberModal from "./modals/AddMemberModal";
import "./KanbanBoard.css";

export default function KanbanBoard({ project }) {
  const [user, setUser] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  // --- AUTH USER ---
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    })();
  }, []);

  // --- FETCH COLUMNS ---
  const fetchColumns = useCallback(async () => {
    if (!project?.project_id) return;
    const { data, error } = await supabase
      .from("project_columns")
      .select("column_id, name, position, order")
      .eq("project_id", project.project_id)
      .order("position", { ascending: true });
    if (error) {
      toast.error("Failed to load columns");
      return setColumns([]);
    }

    if (!data || data.length === 0) {
      // create default columns if none exist
      const defaults = [
        { name: "To Do", position: 0, order: 0 },
        { name: "In Progress", position: 1, order: 1 },
        { name: "Done", position: 2, order: 2 },
      ].map((c) => ({ ...c, project_id: project.project_id }));

      await supabase.from("project_columns").insert(defaults);
      const { data: newCols } = await supabase
        .from("project_columns")
        .select("column_id, name, position, order")
        .eq("project_id", project.project_id)
        .order("position", { ascending: true });
      setColumns(newCols || []);
    } else {
      setColumns(data);
    }
  }, [project?.project_id]);

  // --- FETCH TASKS ---
  const fetchTasks = useCallback(async () => {
    if (!project?.project_id) return;
    const { data, error } = await supabase
      .from("kanban_tasks")
      .select("*")
      .eq("project_id", project.project_id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error.message);
      toast.error("Failed to load tasks");
      return setTasks([]);
    }
    setTasks(data || []);
    setLoading(false);
  }, [project?.project_id]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchColumns();
    fetchTasks();
  }, [fetchColumns, fetchTasks]);

  // --- REALTIME UPDATES ---
  useEffect(() => {
    if (!project?.project_id) return;
    const ch = supabase
      .channel(`kanban-tasks-${project.project_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kanban_tasks",
          filter: `project_id=eq.${project.project_id}`,
        },
        () => fetchTasks()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [project?.project_id, fetchTasks]);

  // --- ADD TASK ---
  const openTaskModal = (column_id) => {
    setSelectedColumn(column_id);
    setShowTaskModal(true);
  };

  const handleTaskAdded = async (title) => {
    await fetchTasks();
    await supabase.from("project_remarks").insert([
      {
        project_id: project.project_id,
        created_by: user?.id || null,
        remark: `System: Task "${title}" created.`,
      },
    ]);
  };

  // --- DRAG & DROP ---
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    // No movement
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const movedTask = tasks.find((t) => t.id === draggableId);
    if (!movedTask) return;

    const fromColumn = columns.find((c) => c.column_id === source.droppableId);
    const toColumn = columns.find((c) => c.column_id === destination.droppableId);

    // Local move
    const updated = tasks.map((t) =>
      t.id === draggableId ? { ...t, column_id: toColumn.column_id } : t
    );
    setTasks(updated);

    try {
      const { error } = await supabase
        .from("kanban_tasks")
        .update({
          column_id: toColumn.column_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draggableId);
      if (error) throw error;

      // Add system remark
      await supabase.from("project_remarks").insert([
        {
          project_id: project.project_id,
          created_by: user?.id || null,
          remark: `System: Task "${movedTask.title}" moved from ${fromColumn.name} → ${toColumn.name}.`,
        },
      ]);
    } catch (e) {
      console.error("Move failed:", e.message);
      toast.error("Failed to move task, reverting...");
      setTasks(tasks); // revert local state
    }
  };

  if (!project) {
    return (
      <div className="flex justify-center items-center h-full text-gray-500">
        Select a project to view.
      </div>
    );
  }

  return (
    <div className="kanban-container">
      <div className="kanban-header">
        <h2 className="kanban-title">{project.name}</h2>
        <div className="kanban-actions">
          <button
            className="kanban-btn blue"
            onClick={() => openTaskModal(columns[0]?.column_id)}
          >
            + Task
          </button>
          <button
            className="kanban-btn green"
            onClick={() => setShowMemberModal(true)}
          >
            + Member
          </button>
        </div>
      </div>

      {loading ? (
        <div className="kanban-loading">Loading...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board">
            {columns.map((col) => (
              <Droppable droppableId={col.column_id} key={col.column_id}>
                {(provided) => (
                  <div
                    className="kanban-column"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <div className="kanban-column-header">
                      <h3>{col.name}</h3>
                      <button
                        className="kanban-column-add"
                        onClick={() => openTaskModal(col.column_id)}
                      >
                        <FaPlus size={12} />
                      </button>
                    </div>

                    <div className="kanban-task-list">
                      {tasks
                        .filter((t) => t.column_id === col.column_id)
                        .map((t, idx) => (
                          <Draggable
                            key={t.id}
                            draggableId={t.id}
                            index={idx}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`kanban-task-card ${
                                  snapshot.isDragging ? "dragging" : ""
                                }`}
                              >
                                <p className="task-title">{t.title}</p>
                                {t.description && (
                                  <p className="task-desc">{t.description}</p>
                                )}
                                {t.deadline && (
                                  <p className="task-deadline">
                                    🕒{" "}
                                    {new Date(t.deadline).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {showTaskModal && (
        <TaskFormModal
          project={project}
          columnId={selectedColumn}
          onClose={() => setShowTaskModal(false)}
          onTaskAdded={handleTaskAdded}
        />
      )}

      {showMemberModal && (
        <AddMemberModal
          projectId={project.project_id}
          onClose={() => setShowMemberModal(false)}
          onMemberAdded={() => toast.success("Member added")}
        />
      )}
    </div>
  );
}
