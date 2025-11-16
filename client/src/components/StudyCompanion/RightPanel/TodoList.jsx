import { useState, useMemo, memo, useCallback } from "react";
import useApi from "../../../api/useApi";

function TodoList({ todos, onUpdate }) {
  const api = useApi();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Handle add todo (memoized)
  const handleAddTodo = useCallback(async () => {
    if (!newTodoText.trim()) return;

    setIsAdding(true);
    try {
      const response = await api.createTodo(newTodoText.trim());

      if (response.success) {
        // Update parent state
        onUpdate("todos", [...todos, response.todo]);
        setNewTodoText("");
      }
    } catch (error) {
      console.error("Failed to create todo:", error);
      alert("Failed to create todo. Please try again.");
    } finally {
      setIsAdding(false);
    }
  }, [newTodoText, api, todos, onUpdate]);

  // Handle toggle completion (memoized)
  const handleToggleTodo = useCallback(async (todoId, currentCompleted) => {
    try {
      await api.updateTodo(todoId, { completed: !currentCompleted });

      // Update parent state
      const updatedTodos = todos.map((t) =>
        (t._id || t.id) === todoId ? { ...t, completed: !currentCompleted } : t
      );
      onUpdate("todos", updatedTodos);
    } catch (error) {
      console.error("Failed to update todo:", error);
      alert("Failed to update todo. Please try again.");
    }
  }, [api, todos, onUpdate]);

  // Handle delete todo (memoized)
  const handleDeleteTodo = useCallback(async (todoId) => {
    try {
      await api.deleteTodo(todoId);

      // Update parent state
      const updatedTodos = todos.filter((t) => (t._id || t.id) !== todoId);
      onUpdate("todos", updatedTodos);
    } catch (error) {
      console.error("Failed to delete todo:", error);
      alert("Failed to delete todo. Please try again.");
    }
  }, [api, todos, onUpdate]);

  // Handle Enter key press (memoized)
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !isAdding) {
      handleAddTodo();
    }
  }, [isAdding, handleAddTodo]);

  // Count incomplete todos (memoized)
  const incompleteTodos = useMemo(() => {
    return todos.filter((t) => !t.completed).length;
  }, [todos]);

  return (
    <div className={`todo-list ${isExpanded ? "expanded" : "minimized"}`}>
      <button
        className="todo-header"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-controls="todo-content"
        aria-label={`To-Do List, ${incompleteTodos} incomplete tasks. Click to ${isExpanded ? 'collapse' : 'expand'}`}
      >
        <h3 id="todo-list-heading">To-Do List ({incompleteTodos})</h3>
        <span className="toggle-icon" aria-hidden="true">
          {isExpanded ? "▼" : "▲"}
        </span>
      </button>

      {isExpanded && (
        <div className="todo-content" id="todo-content">
          <div className="todo-input" role="group" aria-label="Add new todo">
            <label htmlFor="new-todo-input" className="visually-hidden">New todo task</label>
            <input
              id="new-todo-input"
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a new task..."
              disabled={isAdding}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "var(--input-bg)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "14px",
                transition: "all 0.2s ease",
              }}
              aria-label="New todo input"
            />
            <button
              onClick={handleAddTodo}
              disabled={isAdding || !newTodoText.trim()}
              className="btn-primary btn-sm"
              style={{
                padding: "10px 16px",
                fontSize: "18px",
                fontWeight: "bold",
              }}
              aria-label="Add todo"
            >
              +
            </button>
          </div>

          <ul className="todo-items" role="list" aria-label="Todo items">
            {todos.length === 0 ? (
              <li
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "var(--muted)",
                  fontSize: "14px",
                  listStyle: "none",
                }}
                role="status"
              >
                No tasks yet. Add one above!
              </li>
            ) : (
              todos.map((todo) => (
                <TodoItem
                  key={todo._id || todo.id}
                  todo={todo}
                  onToggle={handleToggleTodo}
                  onDelete={handleDeleteTodo}
                />
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Memoize the main component
export default memo(TodoList);

// TodoItem component (memoized)
const TodoItem = memo(function TodoItem({ todo, onToggle, onDelete }) {
  const todoId = todo._id || todo.id;

  return (
    <li className={`todo-item ${todo.completed ? "completed" : ""}`} role="listitem">
      <label className="todo-item-label">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todoId, todo.completed)}
          className="todo-checkbox"
          aria-label={`Mark "${todo.text}" as ${
            todo.completed ? "incomplete" : "complete"
          }`}
        />
        <span className="todo-text">{todo.text}</span>
      </label>
      <button
        onClick={() => onDelete(todoId)}
        className="btn-icon btn-delete"
        style={{
          padding: "4px 8px",
          fontSize: "14px",
        }}
        aria-label={`Delete "${todo.text}"`}
        title="Delete task"
      >
        🗑️
      </button>
    </li>
  );
});
