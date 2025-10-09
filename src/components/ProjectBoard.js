// src/components/ProjectBoard.js
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { FaPlus } from "react-icons/fa";
import KanbanBoard from "./KanbanBoard";
import ProjectSnapshotPanel from "./ProjectSnapshotPanel";
import ProjectFormModal from "./modals/ProjectFormModal";

export default function ProjectBoard({ role }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [searchProject, setSearchProject] = useState("");

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*, profiles(incharge)")
      .order("created_at", { ascending: true });

    if (error) toast.error(error.message);
    else setProjects(data || []);
  }, []);

  // Fetch projects on load
  useEffect(() => {
    fetchProjects();

    const channel = supabase
      .channel("rt-projects")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, fetchProjects)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchProjects]);

  const handleSelectProject = (project) => setSelectedProject(project);

  const filteredProjects = projects.filter((p) =>
    p.title?.toLowerCase().includes(searchProject.toLowerCase())
  );

  return (
    <div className="flex h-[90vh] p-4 gap-4 bg-gray-50">
      <Toaster position="top-right" />

      {/* LEFT PANEL — PROJECT LIST */}
      <div className="w-1/5 bg-white border rounded-lg p-4 flex flex-col">
        <div className="flex gap-2 items-center mb-4">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchProject}
            onChange={(e) => setSearchProject(e.target.value)}
            className="flex-1 border rounded px-2 py-1 text-sm"
          />
          <button
            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
            onClick={() => setShowProjectModal(true)}
          >
            <FaPlus />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-2">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => handleSelectProject(p)}
              className={`p-2 rounded cursor-pointer border ${
                selectedProject?.id === p.id
                  ? "bg-blue-100 border-blue-500"
                  : "hover:bg-gray-100"
              }`}
            >
              <p className="font-semibold text-sm">{p.title}</p>
              <p className="text-xs text-gray-500">{p.project_type}</p>
            </div>
          ))}
        </div>
      </div>

      {/* MIDDLE PANEL — KANBAN BOARD */}
      <div className="w-3/5 bg-white border rounded-lg p-4 overflow-y-auto">
        {selectedProject ? (
          <KanbanBoard project={selectedProject} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a project to view tasks
          </div>
        )}
      </div>

      {/* RIGHT PANEL — ACTIVITY LOG */}
{/*       <div className="w-1/5 bg-white border rounded-lg p-4">
        {selectedProject ? (
          <ActivityLog project={selectedProject} user={currentUser} />
        ) : (
          <div className="text-gray-400 text-center mt-10">
            No project selected
          </div>
        )}
      </div> */}

      {/* MODALS */}
      {showProjectModal && (
        <ProjectFormModal
          onClose={() => setShowProjectModal(false)}
          onCreated={fetchProjects}
        />
      )}
    </div>
  );
}
