import { useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * Reusable realtime listener hook
 * @param {string} tableName - the table name
 * @param {function} callback - function to run when change happens
 * @param {string} [schema='public']
 * @param {string} [channelId] - optional unique id
 */
export default function useRealtimeListener(tableName, callback, schema = "public", channelId = null) {
  useEffect(() => {
    if (!tableName || !callback) return;

    const channel = supabase
      .channel(channelId || `realtime-${tableName}`)
      .on("postgres_changes", { event: "*", schema, table: tableName }, (payload) => {
        console.log(`⚡ Realtime change in ${tableName}:`, payload);
        callback(payload);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [tableName, schema, channelId, callback]);
}
