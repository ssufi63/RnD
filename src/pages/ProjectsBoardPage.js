import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

import KanbanBoard from "../components/KanbanBoard";
import ProjectDetailsPanel from "../components/ProjectDetailsPanel";
import ProjectSnapshotPanel from "../components/ProjectSnapshotPanel";
import ProjectFormModal from "../components/modals/ProjectFormModal";
import TaskFormModal from "../components/modals/TaskFormModal";
import AddMemberModal from "../components/modals/AddMemberModal";
import ProjectFormEdit from "../components/modals/ProjectFormEdit";

import "./ProjectsBoardPage.css";

export default function ProjectsBoardPage({ role }) {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const mainPanelRef = useRef(null);

  // ---------- AUTH ----------
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error(error.message);
      setUser(data?.user || null);
    })();
  }, []);

  // ---------- FETCH PROJECTS ----------
  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isManager = ["admin", "manager", "team_leader"].includes(profile?.role);
      let projList = [];

      if (isManager) {
        const { data } = await supabase
          .from("projects")
          .select("*")
          .eq("archived", false)
          .order("created_at", { ascending: true });
        projList = data || [];
      } else {
        const { data: links } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", user.id);
        const ids = (links || []).map((l) => l.project_id);
        if (ids.length) {
          const { data } = await supabase
            .from("projects")
            .select("*")
            .in("project_id", ids)
            .eq("archived", false)
            .order("created_at", { ascending: true });
          projList = data || [];
        }
      }

      setProjects(projList);
      setFiltered(projList);

      if (projList.length > 0) {
        if (!selectedProject) setSelectedProject(projList[0]);
        else {
          const stillThere = projList.find(
            (p) => p.project_id === selectedProject.project_id
          );
          if (!stillThere) setSelectedProject(projList[0]);
        }
      } else setSelectedProject(null);
    } catch (e) {
      console.error(e.message);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [user, selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ---------- SEARCH ----------
  useEffect(() => {
    if (!search.trim()) setFiltered(projects);
    else {
      const term = search.toLowerCase();
      setFiltered(projects.filter((p) => (p.name || "").toLowerCase().includes(term)));
    }
  }, [search, projects]);

  // ---------- REALTIME ----------
  useEffect(() => {
    const ch = supabase
      .channel("rt-projects-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () =>
        fetchProjects()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchProjects]);

  // ---------- FULLSCREEN ----------
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      mainPanelRef.current?.requestFullscreen().catch(() =>
        toast.error("Fullscreen not supported")
      );
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

function ProjectHeaderMembers({ projectId }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("profiles(full_name)")
        .eq("project_id", projectId);
      if (!error) setMembers(data || []);
    })();
  }, [projectId]);

  if (!members.length) return null;

  return (
    <div className="header-members">
      {members.map((m, i) => (
        <span key={i} className="header-member-pill">
          {m.profiles?.full_name}
        </span>
      ))}
    </div>
  );
}

  // ---------- RENDER ----------
  return (
    <div className={`projects-board-page ${isFullScreen ? "fullscreen" : ""}`}>
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Projects</h3>
          <button className="add-btn" onClick={() => setShowProjectModal(true)}>
            + Add
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

      {/* MAIN PANEL */}
      <div className="main-panel" ref={mainPanelRef}>
        {!selectedProject ? (
          <div className="empty-state">Select a project to view.</div>
        ) : (
          <>
         <div className="project-header">
  <div className="left">
    <h2 className="project-title">
      {selectedProject.name} — <span>Details</span>
    </h2>

    <ProjectHeaderMembers projectId={selectedProject.project_id} />
  </div>


              <div className="right">
                <button className="btn primary" onClick={() => setShowTaskModal(true)}>
                  + Task
                </button>
                <button
                  className="btn primary"
                  onClick={() => setShowMemberModal(true)}
                >
                  + Member
                </button>
                <button
                  className="btn secondary"
                  onClick={() => setShowEditProjectModal(true)}
                >
                  Edit
                </button>
                <button className="btn secondary" onClick={toggleFullScreen}>
                  {isFullScreen ? "Exit Fullscreen" : "⛶ Fullscreen"}
                </button>

                {isFullScreen && (
                  <>
                    <button
                      className="btn secondary"
                      onClick={() => setShowSnapshot((prev) => !prev)}
                    >
                      {showSnapshot ? "Hide Snapshot" : "📊 Snapshot"}
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => {
                        if (!projects.length) return;
                        const i = projects.findIndex(
                          (p) => p.project_id === selectedProject.project_id
                        );
                        setSelectedProject(projects[(i + 1) % projects.length]);
                      }}
                    >
                      ⏭ Next
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => {
                        if (!projects.length) return;
                        const i = projects.findIndex(
                          (p) => p.project_id === selectedProject.project_id
                        );
                        setSelectedProject(
                          projects[(i - 1 + projects.length) % projects.length]
                        );
                      }}
                    >
                      ⏮ Prev
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="tab-content">
              {activeTab === "kanban" ? (
                <KanbanBoard project={selectedProject} />
              ) : (
                <ProjectDetailsPanel project={selectedProject} hideHeader />
              )}
            </div>

            {isFullScreen && showSnapshot && (
              <div className="snapshot-overlay">
                <ProjectSnapshotPanel project={selectedProject} />
              </div>
            )}
          </>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="activity-panel">
        {selectedProject ? (
          <ProjectSnapshotPanel project={selectedProject} />
        ) : (
          <div className="text-gray-400 text-sm p-4">No project selected.</div>
        )}
      </div>

      {/* MODALS */}
      {showProjectModal && (
        <ProjectFormModal
          onClose={() => setShowProjectModal(false)}
          onSaved={fetchProjects}
        />
      )}
      {showTaskModal && (
        <TaskFormModal
          project={selectedProject}
          onClose={() => setShowTaskModal(false)}
        />
      )}
      {showMemberModal && (
        <AddMemberModal
          projectId={selectedProject.project_id}
          onClose={() => setShowMemberModal(false)}
        />
      )}
      {showEditProjectModal && (
        <ProjectFormEdit
          project={selectedProject}
          onClose={() => setShowEditProjectModal(false)}
        />
      )}
    </div>
  );
}
