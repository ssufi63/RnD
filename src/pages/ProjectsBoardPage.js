import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

import KanbanBoard from "../components/KanbanBoard";
import ProjectDetailsPanel from "../components/ProjectDetailsPanel";
import ProjectSnapshotPanel from "../components/ProjectSnapshotPanel";
import ProjectFormModal from "../components/modals/ProjectFormModal";

import "./ProjectsBoardPage.css";

export default function ProjectsBoardPage({ role }) {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState("kanban"); // "kanban" | "details"
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // get auth user once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error(error.message);
      }
      setUser(data?.user || null);
    })();
  }, []);

  // fetch projects visible to this user
  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // role check
      const { data: profile, error: roleErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (roleErr) throw roleErr;
      const isManager = ["admin", "manager", "team_leader"].includes(
        profile?.role
      );

      let projList = [];
      if (isManager) {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("archived", false)
          .order("created_at", { ascending: true });
        if (error) throw error;
        projList = data || [];
      } else {
        // fetch project IDs where user is a member
        const { data: links, error: linkErr } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", user.id);
        if (linkErr) throw linkErr;

        const ids = (links || []).map((l) => l.project_id);
        if (!ids.length) {
          projList = [];
        } else {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .in("project_id", ids)
            .eq("archived", false)
            .order("created_at", { ascending: true });
          if (error) throw error;
          projList = data || [];
        }
      }

      setProjects(projList);
      setFiltered(projList);

      // keep selection if possible
      if (projList.length > 0) {
        if (!selectedProject) setSelectedProject(projList[0]);
        else {
          const stillThere = projList.find(
            (p) => p.project_id === selectedProject.project_id
          );
          if (!stillThere) setSelectedProject(projList[0]);
        }
      } else {
        setSelectedProject(null);
      }
    } catch (e) {
      console.error(e.message);
      toast.error("Failed to load projects");
      setProjects([]);
      setFiltered([]);
      setSelectedProject(null);
    } finally {
      setLoading(false);
    }
  }, [user, selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // search filter
  useEffect(() => {
    if (!search.trim()) setFiltered(projects);
    else {
      const term = search.toLowerCase();
      setFiltered(
        projects.filter((p) => (p.name || "").toLowerCase().includes(term))
      );
    }
  }, [search, projects]);

  // realtime for projects list
  useEffect(() => {
    const ch = supabase
      .channel("rt-projects-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => fetchProjects()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchProjects]);

  return (
    <div className="projects-board-page">
      {/* LEFT: Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Projects</h3>
          <button className="add-btn" onClick={() => setShowProjectModal(true)}>
            + Add Project
          </button>
        </div>
        <input
          type="text"
          placeholder="Search..."
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="project-list">
          {loading ? (
            <div className="text-gray-400 text-sm p-3">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-400 text-sm p-3">No projects found.</div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.project_id}
                className={`project-item ${
                  selectedProject?.project_id === p.project_id ? "active" : ""
                }`}
                onClick={() => setSelectedProject(p)}
              >
                {p.name}
              </div>
            ))
          )}
        </div>
      </div>

      {/* CENTER: Tabs + content */}
      <div className="main-panel">
        {!selectedProject ? (
          <div className="empty-state">Select a project to view.</div>
        ) : (
          <>
            <div className="tab-header">
              <button
                className={`tab-btn ${
                  activeTab === "kanban" ? "active" : ""
                }`}
                onClick={() => setActiveTab("kanban")}
              >
                Kanban
              </button>
              <button
                className={`tab-btn ${
                  activeTab === "details" ? "active" : ""
                }`}
                onClick={() => setActiveTab("details")}
              >
                Details
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "kanban" ? (
                <KanbanBoard project={selectedProject} />
              ) : (
                <ProjectDetailsPanel project={selectedProject} />
              )}
            </div>
          </>
        )}
      </div>

      {/* RIGHT: Activity (project-level) */}
      <div className="activity-panel">
        {selectedProject ? (
          <ProjectSnapshotPanel project={selectedProject} />
        ) : (
          <div className="text-gray-400 text-sm p-4">No project selected.</div>
        )}
      </div>

      {showProjectModal && (
        <ProjectFormModal
          onClose={() => setShowProjectModal(false)}
          onSaved={fetchProjects}
        />
      )}
    </div>
  );
}
