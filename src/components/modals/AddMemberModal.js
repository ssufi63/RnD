import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import toast from "react-hot-toast";

export default function AddMemberModal({ projectId, onClose, onMemberAdded }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name", { ascending: true });
      if (error) console.error(error.message);
      setUsers(data || []);
    })();
  }, []);

  const add = async () => {
    if (!selected) return toast.error("Select a user");
    setSaving(true);
    try {
      const { error } = await supabase
        .from("project_members")
        .insert([{ project_id: projectId, user_id: selected }]);
      if (error) throw error;
      toast.success("Member added");
      onMemberAdded?.();
      onClose?.();
    } catch (e) {
      console.error(e.message);
      toast.error("Failed to add member (maybe already added)");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add Member</h3>
        <div className="modal-form">
          <select
            className="modal-input"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select a user...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>

          <div className="modal-actions">
            <button className="btn-gray" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-blue" onClick={add} disabled={saving}>
              {saving ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-card { background: #fff; border-radius: 12px; padding: 16px; width: 420px; max-width: calc(100vw - 24px); box-shadow: 0 10px 30px rgba(0,0,0,.15); }
        .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .modal-form { display: flex; flex-direction: column; gap: 8px; }
        .modal-input { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 10px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
        .btn-blue { background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
        .btn-blue:hover { background: #1d4ed8; }
        .btn-gray { background: #f3f4f6; color: #111827; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
      `}</style>
    </div>
  );
}
