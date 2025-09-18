// src/components/ProjectBoard.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { FaArchive, FaTrash, FaPlus } from "react-icons/fa";

// 🔹 Reusable Icon Button
function IconButton({ children, baseStyle, hoverStyle, ...props }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      {...props}
      style={{
        ...baseStyle,
        ...(hover ? hoverStyle : {}),
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

export default function ProjectBoard({ role }) {
  const isManager = useMemo(
    () => ["admin", "team_leader", "manager"].includes(role),
    [role]
  );

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskProjects, setTaskProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // search states
  const [searchProjects, setSearchProjects] = useState("");
  const [searchTasks, setSearchTasks] = useState("");

  // form state
  const [showForm, setShowForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  // hover state for Add Project button
  const [addBtnHover, setAddBtnHover] = useState(false);

  // 🔹 Fetch all data
  const fetchAll = useCallback(async () => {
    setLoading(true);

    const { data: proj } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });

    const { data: allTasks } = await supabase
      .from("tasks")
      .select("id, task_title, product, status, priority, start_date, deadline")
      .order("created_at", { ascending: false });

    const { data: mappings } = await supabase.from("task_projects").select("*");

    setProjects(proj || []);
    setTasks(allTasks || []);
    setTaskProjects(mappings || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // 🔹 Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("rt-project-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_projects" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  // 🔹 Helpers
  const getProjectIdForTask = useCallback(
    (taskId) => taskProjects.find((tp) => tp.task_id === taskId)?.project_id || null,
    [taskProjects]
  );

  const tasksInProject = useCallback(
    (projectId) => tasks.filter((t) => getProjectIdForTask(t.id) === projectId),
    [tasks, getProjectIdForTask]
  );

  const unassignedTasks = useMemo(
    () => tasks.filter((t) => !getProjectIdForTask(t.id)),
    [tasks, getProjectIdForTask]
  );

  // 🔹 Drag and Drop
  const onDragEnd = async (result) => {
    if (!result.destination) return;
    if (!isManager) return;

    const { draggableId, destination } = result;
    const taskId = draggableId; // UUID string
    const destId = destination.droppableId;

    if (destId === "unassigned") {
      await supabase.from("task_projects").delete().eq("task_id", taskId);
      setTaskProjects((prev) => prev.filter((tp) => tp.task_id !== taskId));
      return;
    }

    await supabase.from("task_projects").upsert(
      [{ task_id: taskId, project_id: destId }],
      { onConflict: "task_id" }
    );
    setTaskProjects((prev) => {
      const without = prev.filter((tp) => tp.task_id !== taskId);
      return [...without, { task_id: taskId, project_id: destId }];
    });
  };

  // 🔹 Create new project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const { data, error } = await supabase
      .from("projects")
      .insert([{ name: newProjectName.trim(), description: newProjectDesc.trim() || null }])
      .select();

    if (error) {
      alert("Error creating project: " + error.message);
      return;
    }

    if (data && data.length > 0) {
      setProjects((prev) => [...prev, data[0]]);
    }

    setNewProjectName("");
    setNewProjectDesc("");
    setShowForm(false);
  };

  // 🔹 Archive project
  const handleArchiveProject = async (projectId) => {
    const { error } = await supabase
      .from("projects")
      .update({ archived: true })
      .eq("project_id", projectId);

    if (error) {
      alert("Error archiving project: " + error.message);
    } else {
      setProjects((prev) =>
        prev.map((p) =>
          p.project_id === projectId ? { ...p, archived: true } : p
        )
      );
    }
  };

  // 🔹 Delete project
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("⚠️ This will permanently delete the project. Continue?")) return;

    await supabase.from("task_projects").delete().eq("project_id", projectId);

    const { error } = await supabase.from("projects").delete().eq("project_id", projectId);

    if (error) {
      alert("Error deleting project: " + error.message);
    } else {
      setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
    }
  };

  if (!isManager) {
    return <div style={{ padding: 20 }}>Access restricted</div>;
  }

  // 🔹 Filtered lists
  const filteredProjects = projects.filter(
    (p) =>
      !p.archived &&
      p.name.toLowerCase().includes(searchProjects.toLowerCase())
  );
  const filteredUnassigned = unassignedTasks.filter((t) =>
    t.task_title.toLowerCase().includes(searchTasks.toLowerCase())
  );

  return (
    <div style={{ padding: 20 }}>
      {/* 🔹 Top Header Row */}
      <div style={styles.headerRow}>
        {/* Projects Header */}
        <div style={styles.headerGroup}>
          <h2 style={{ margin: 0 }}>Projects</h2>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchProjects}
            onChange={(e) => setSearchProjects(e.target.value)}
            style={styles.searchInput}
          />
          <button
            onClick={() => setShowForm(true)}
            style={addBtnHover ? { ...styles.addProjectBtn, ...styles.addProjectBtnHover } : styles.addProjectBtn}
            onMouseEnter={() => setAddBtnHover(true)}
            onMouseLeave={() => setAddBtnHover(false)}
          >
            <FaPlus style={{ color: "white", fontSize: "14px" }} /> Add Project
          </button>
        </div>

        {/* Tasks Header */}
        <div style={styles.headerGroup}>
          <h2 style={{ margin: 0 }}>Tasks</h2>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTasks}
            onChange={(e) => setSearchTasks(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* 🔹 Modal for Create Project */}
      {showForm && (
        <div style={styles.modalBackdrop} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Create New Project</h3>
            <form onSubmit={handleCreateProject} style={styles.form}>
              <input
                type="text"
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                style={styles.input}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.button}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔹 Drag and Drop Panels */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={styles.container}>
          {/* Left Panel - Projects */}
          <div style={styles.leftPanel}>
            <ul style={styles.projectList}>
              {filteredProjects.map((p) => (
                <Droppable droppableId={String(p.project_id)} key={p.project_id}>
                  {(provided) => (
                    <li ref={provided.innerRef} {...provided.droppableProps} style={styles.projectItem}>
                      <div style={styles.projectHeaderRow}>
                        <span style={styles.projectName}>{p.name}</span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <IconButton
                            onClick={() => handleArchiveProject(p.project_id)}
                            baseStyle={styles.archiveBtn}
                            hoverStyle={{ background: "#03bb2eff", transform: "scale(1.1)" }}
                            title="Archive Project"
                          >
                            <FaArchive />
                          </IconButton>

                          <IconButton
                            onClick={() => handleDeleteProject(p.project_id)}
                            baseStyle={styles.deleteBtn}
                            hoverStyle={{ background: "#dc2626", transform: "scale(1.1)" }}
                            title="Delete Project"
                          >
                            <FaTrash />
                          </IconButton>
                        </div>
                      </div>
                      <ul style={styles.projectTasksList}>
                        {tasksInProject(p.project_id).map((t, idx) => (
                          <Draggable draggableId={String(t.id)} index={idx} key={t.id}>
                            {(drag) => (
                              <li
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                {...drag.dragHandleProps}
                                style={{ ...styles.projectTaskItem, ...drag.draggableProps.style }}
                              >
                                {t.task_title}
                              </li>
                            )}
                          </Draggable>
                        ))}
                      </ul>
                      {provided.placeholder}
                    </li>
                  )}
                </Droppable>
              ))}
            </ul>
          </div>

          {/* Right Panel - Unassigned */}
          <Droppable droppableId="unassigned">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  ...styles.rightPanel,
                  background: snapshot.isDraggingOver ? "#f0f9ff" : "#fff",
                  border: snapshot.isDraggingOver
                    ? "2px dashed #2563eb"
                    : "1px solid #e5e7eb",
                }}
              >
                {filteredUnassigned.map((t, idx) => (
                  <Draggable draggableId={String(t.id)} index={idx} key={t.id}>
                    {(drag) => (
                      <li
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        {...drag.dragHandleProps}
                        style={{ ...styles.taskItem, ...drag.draggableProps.style }}
                      >
                        {t.task_title}
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  );
}

const styles = {
  headerRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "16px",
  },
  headerGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f9fafb",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  searchInput: {
    flex: 1,
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: 6,
  },
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  leftPanel: {
    background: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
  },
  rightPanel: {
    background: "#fff",
    padding: 16,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
  },
  projectList: { listStyle: "none", padding: 0, margin: 0 },
  projectItem: {
    padding: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#fff",
    marginBottom: 8,
  },
  projectHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  projectName: { fontWeight: 600 },
  projectTasksList: { listStyle: "none", padding: 0, margin: 0 },
  projectTaskItem: {
    padding: "8px 10px",
    marginBottom: 6,
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    background: "#fdfdfd",
    fontSize: 14,
  },
  taskItem: {
    padding: "10px",
    marginBottom: "8px",
    border: "1px solid #ddd",
    borderRadius: 6,
    background: "#fff",
    fontWeight: 500,
    listStyle: "none",
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },
  cancelBtn: {
    background: "#f3f4f6",
    border: "1px solid #ccc",
    padding: "8px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },
  archiveBtn: {
    background: "#049f28ff",
    border: "none",
    color: "white",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    transition: "background 0.2s",
  },
  deleteBtn: {
    background: "#ef4444",
    border: "none",
    color: "white",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    marginLeft: "8px",
    transition: "background 0.2s",
  },
  addProjectBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "15px",
    fontWeight: "700",
    fontFamily: "'Segoe UI', sans-serif",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s ease-in-out",
  },
  addProjectBtnHover: {
    background: "#1d4ed8",
    transform: "scale(1.05)",
  },
  modalBackdrop: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 8,
    width: "400px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
  },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: { padding: "8px", border: "1px solid #ccc", borderRadius: 6 },
};
