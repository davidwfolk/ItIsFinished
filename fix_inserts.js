const fs = require('fs');
const path = require('path');

const filePath = path.join('apps', 'web', 'src', 'pages', 'Workspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. handleAddTask
content = content.replace(
  /\INSERT INTO tasks \(id, project_id, title, priority, due_date, due_time, estimated_minutes, order_index, status, created_at, updated_at\)\n         VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)\/,
  \\INSERT INTO tasks (id, workspace_id, project_id, title, priority, due_date, due_time, estimated_minutes, order_index, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\\
);
content = content.replace(
  /newId,\n\s*targetProjectId,/,
  "newId,\n          activeWorkspaceId,\n          targetProjectId,"
);

// 2. toggleTaskCompletion recurrence creation
content = content.replace(
  /\INSERT INTO tasks \(id, project_id, title, priority, due_date, due_time, estimated_minutes, recurrence_rule, order_index, status, created_at, updated_at\)\n           VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)\/,
  \\INSERT INTO tasks (id, workspace_id, project_id, title, priority, due_date, due_time, estimated_minutes, recurrence_rule, order_index, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\\
);
content = content.replace(
  /nextId,\n\s*task\.project_id \|\| 'proj-core-arch',/,
  "nextId,\n            activeWorkspaceId,\n            task.project_id || 'proj-core-arch',"
);

// 3. handleAddSectionTask
content = content.replace(
  /\INSERT INTO tasks \(id, project_id, section_id, title, priority, order_index, status, created_at, updated_at\)\n         VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?\)\/,
  \\INSERT INTO tasks (id, workspace_id, project_id, section_id, title, priority, order_index, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\\
);
content = content.replace(
  /\[newId, selectedProjectId \|\| 'proj-core-arch', sectionId, title, 4, newIndex, 'todo', now, now\]/,
  "[newId, activeWorkspaceId, selectedProjectId || 'proj-core-arch', sectionId, title, 4, newIndex, 'todo', now, now]"
);

// 4. addTaskToQuadrant
content = content.replace(
  /\INSERT INTO tasks \(id, project_id, title, priority, due_date, order_index, status, created_at, updated_at\)\n         VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?\)\/,
  \\INSERT INTO tasks (id, workspace_id, project_id, title, priority, due_date, order_index, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\\
);
content = content.replace(
  /crypto\.randomUUID\(\),\n\s*'proj-core-arch',/,
  "crypto.randomUUID(),\n          activeWorkspaceId,\n          'proj-core-arch',"
);

// We must also update handleCreateProject and handleCreateSection if they exist in Workspace.tsx
// Projects are created in ProjectModal.tsx, not Workspace.tsx. Wait!

fs.writeFileSync(filePath, content);
console.log('done');
