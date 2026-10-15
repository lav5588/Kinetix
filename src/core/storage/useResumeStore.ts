import { create } from 'zustand';
import { resumeManager } from './resumeManager';
import type { ResumeRecord } from './types';

export type ResumeCategory = ResumeRecord['category'];

interface ResumeStoreState {
  items: ResumeRecord[];
  saveResumeState: (record: ResumeRecord) => ResumeRecord;
  getResumeState: (filePath: string) => ResumeRecord | null;
  removeResumeState: (filePath: string) => void;
  clearAllHistory: () => void;
  refreshHistory: (limit?: number, category?: ResumeCategory) => void;
}

export const useResumeStore = create<ResumeStoreState>((set) => ({
  items: resumeManager.getRecentHistory(),

  saveResumeState: (record: ResumeRecord) => {
    const saved = resumeManager.saveResumeState(record);
    set({ items: resumeManager.getRecentHistory() });
    return saved;
  },

  getResumeState: (filePath: string) => resumeManager.getResumeState(filePath),

  removeResumeState: (filePath: string) => {
    resumeManager.removeResumeState(filePath);
    set({ items: resumeManager.getRecentHistory() });
  },

  clearAllHistory: () => {
    resumeManager.clearAllHistory();
    set({ items: [] });
  },

  refreshHistory: (limit = 15, category?: ResumeCategory) => {
    const nextItems = resumeManager.getRecentHistory(limit, category);
    set({ items: nextItems });
  },
}));

export default useResumeStore;
