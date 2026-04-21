export type WorkspaceMode = 'monitor' | 'atacar' | 'defensar' | 'comparar' | 'oportunitat';
export type WorkspaceStatus = 'actiu' | 'arxivat' | 'usat_en_ple';

export interface WorkspaceItem {
  id: string;
  mode: WorkspaceMode;
  title: string;
  content: string;
  query: string;
  sources: string[];
  createdAt: string;
  tags: string[];
  starred: boolean;
  notes: string;
  status: WorkspaceStatus;
}

const KEY = 'ajuntamentia_workspaces';
const OLD_KEY = 'ayuntamentia_workspaces';

function migrateWorkspaceKey() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(KEY) && localStorage.getItem(OLD_KEY)) {
    localStorage.setItem(KEY, localStorage.getItem(OLD_KEY)!);
    localStorage.removeItem(OLD_KEY);
  }
}

export function loadWorkspace(): WorkspaceItem[] {
  if (typeof window === 'undefined') return [];
  migrateWorkspaceKey();
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveWorkspace(items: WorkspaceItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addWorkspaceItem(item: Omit<WorkspaceItem, 'id' | 'createdAt'>): WorkspaceItem {
  const newItem: WorkspaceItem = {
    ...item,
    id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const items = loadWorkspace();
  saveWorkspace([newItem, ...items]);
  return newItem;
}

export function updateWorkspaceItem(id: string, updates: Partial<WorkspaceItem>): void {
  const items = loadWorkspace();
  saveWorkspace(items.map(i => i.id === id ? { ...i, ...updates } : i));
}

export function deleteWorkspaceItem(id: string): void {
  saveWorkspace(loadWorkspace().filter(i => i.id !== id));
}

export function getItemsByMode(mode: WorkspaceMode): WorkspaceItem[] {
  return loadWorkspace().filter(i => i.mode === mode && i.status !== 'arxivat');
}

export function autoDetectTags(text: string): string[] {
  const parties = ['AC', 'ERC', 'PSC', 'CUP', 'PP', 'VOX', 'Cs', 'JxCat', 'Junts', 'Comuns'];
  return parties.filter(p => new RegExp(`\\b${p}\\b`, 'i').test(text));
}
