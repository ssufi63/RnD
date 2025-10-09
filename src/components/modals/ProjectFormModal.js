import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import toast from "react-hot-toast";

export default function ProjectFormModal({ onClose, onSaved }) {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState("development");
  const [incharge, setIncharge] = useState("");
  const [people, setPeople] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name", { ascending: true });
      setPeople(profiles || []);
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Project name required");
    setSaving(true);

    try {
      // insert project
      const { data: proj, error } = await supabase
        .from("projects")
        .insert([
          {
            name: name.trim(),
            project_type: projectType,
            incharge: incharge || null, // if you store user id here
            start_date: startDate || null,
            tentative_deadline: deadline || null,
            created_by: user?.id || null,
            archived: false,
          },
        ])
        .select("*")
        .single();

      if (error) throw error;

      // add incharge as member (optional)
      if (incharge) {
        await supabase.from("project_members").insert([
          { project_id: proj.project_id, user_id: incharge },
        ]);
      }

      // create default columns
      const defaults = [
        { name: "To Do", position: 0, order: 0 },
        { name: "In Progress", position: 1, order: 1 },
        { name: "Done", position: 2, order: 2 },
      ].map((c) => ({ ...c, project_id: proj.project_id }));
      await supabase.from("project_columns").insert(defaults);

      toast.success("Project created");
      onClose?.();
      onSaved?.();
    } catch (e) {
      console.error(e.message);
      toast.error("Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Create New Project</h3>

        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">Title</label>
          <input
            className="modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project title"
          />

          <label className="modal-label">Project Type</label>
          <select
            className="modal-input"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            <option value="development">Development</option>
            <option value="research">Research</option>
            <option value="ops">Operations</option>
            <option value="marketing">Marketing</option>
          </select>

          <label className="modal-label">Incharge</label>
          <select
            className="modal-input"
            value={incharge}
            onChange={(e) => setIncharge(e.target.value)}
          >
            <option value="">(none)</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.email}
              </option>
            ))}
          </select>

          <div className="modal-grid">
            <div>
              <label className="modal-label">Start date</label>
              <input
                type="date"
                className="modal-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="modal-label">Tentative deadline</label>
              <input
                type="date"
                className="modal-input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-gray" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-blue" disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>

      {/* Inline styles for modal (self-contained) */}
      <style>{`
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-card { background: #fff; border-radius: 12px; padding: 16px; width: 420px; max-width: calc(100vw - 24px); box-shadow: 0 10px 30px rgba(0,0,0,.15); }
        .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .modal-form { display: flex; flex-direction: column; gap: 8px; }
        .modal-label { font-size: 12px; color: #374151; }
        .modal-input { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 10px; }
        .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
        .btn-blue { background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
        .btn-blue:hover { background: #1d4ed8; }
        .btn-gray { background: #f3f4f6; color: #111827; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
      `}</style>
    </div>
  );
}
