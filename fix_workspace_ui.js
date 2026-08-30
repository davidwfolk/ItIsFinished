const fs = require('fs');
const path = require('path');

const filePath = path.join('apps', 'web', 'src', 'pages', 'Workspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state
content = content.replace(
  "const [activeTab, setActiveTab]",
  "const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);\n  const [activeTab, setActiveTab]"
);

// 2. Update saved filters query
content = content.replace(
  /\SELECT \* FROM saved_filters ORDER BY order_index ASC\/g,
  "\SELECT * FROM saved_filters WHERE workspace_id = ? ORDER BY order_index ASC\, [activeWorkspaceId]"
);

// 3. Update projects query
content = content.replace(
  /WHERE p\.deleted_at IS NULL/g,
  "WHERE p.deleted_at IS NULL AND p.workspace_id = ?"
);
content = content.replace(
  /GROUP BY p\.id/g,
  "GROUP BY p.id\, [activeWorkspaceId] //"
);

// 4. Update sections query
content = content.replace(
  /\SELECT \* FROM sections WHERE deleted_at IS NULL ORDER BY order_index ASC\/g,
  "\SELECT * FROM sections WHERE deleted_at IS NULL AND workspace_id = ? ORDER BY order_index ASC\, [activeWorkspaceId]"
);

// 5. Update tasks query
content = content.replace(
  /WHERE t\.deleted_at IS NULL/g,
  "WHERE t.deleted_at IS NULL AND t.workspace_id = ?"
);
content = content.replace(
  /ORDER BY t\.order_index ASC\/g,
  "ORDER BY t.order_index ASC\, [activeWorkspaceId]"
);

// 6. Inject the WorkspaceSwitcher UI
const uiOld = \        {/* Workspace Brand */}
        <div className="flex items-center justify-between px-2 py-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">
              F
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight text-zinc-100">It Is Finished</h1>
            </div>
          </div>

          {!user && (
            <button
              onClick={() => setAuthModalOpen(true)}
              title="Sign In / Register"
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
            </button>
          )}
        </div>\;

const uiNew = \        {/* Workspace Brand & Switcher */}
        <div className="flex flex-col gap-3 px-2 py-3 mb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">
                F
              </div>
              <div>
                <h1 className="font-semibold text-sm tracking-tight text-zinc-100">It Is Finished</h1>
              </div>
            </div>

            {!user && (
              <button
                onClick={() => setAuthModalOpen(true)}
                title="Sign In / Register"
                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
              >
                <LogIn className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          {user && (
            <WorkspaceSwitcher 
              activeWorkspaceId={activeWorkspaceId} 
              onSwitch={setActiveWorkspaceId} 
            />
          )}
        </div>\;

content = content.replace(uiOld, uiNew);

fs.writeFileSync(filePath, content);
console.log('done');
