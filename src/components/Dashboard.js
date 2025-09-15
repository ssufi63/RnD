import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TaskForm from "../components/TaskForm";
import TaskTable from "../components/TaskTable";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("summary"); // "summary" | "add"

  return (
    <div style={styles.container}>
      {/* Tabs */}
      <div style={styles.tabsWrapper}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === "summary" ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab("summary")}
        >
          📊 Summary
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === "add" ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab("add")}
        >
          ➕ Add Task
        </button>
      </div>

      {/* Tab Content with animation */}
      <div style={styles.content}>
        <AnimatePresence mode="wait">
          {activeTab === "summary" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <TaskTable />
            </motion.div>
          )}

          {activeTab === "add" && (
            <motion.div
              key="add"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <TaskForm />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "90%",
    maxWidth: "1200px",
    margin: "20px auto",
    fontFamily: "Inter, Arial, sans-serif",
    padding: "0 10px",
  },
  tabsWrapper: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  tab: {
    padding: "10px 20px",
    borderRadius: "25px",
    border: "1px solid #ddd",
    background: "linear-gradient(to bottom, #f9f9f9, #f0f0f0)",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    color: "#333",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    minWidth: "120px",
    textAlign: "center",
  },
  activeTab: {
    background: "linear-gradient(135deg, #007bff, #00c6ff)",
    color: "#fff",
    border: "1px solid #007bff",
    boxShadow: "0 3px 8px rgba(0,123,255,0.3)",
    fontWeight: "600",
  },
  content: {
    padding: "20px",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    minHeight: "400px",
    transition: "all 0.3s ease",
    overflowX: "auto",
  },
};
