import { ResumeManager, type ResumeCategory } from '../resumeManager';
import type { ResumeRecord } from '../types';

/**
 * Repository interface for managing playback resume state in MMKV.
 * Provides normalized completion thresholds (>= 97% marks completed)
 * and durable resume record access.
 */
export const ResumeRepository = {
  saveState(record: ResumeRecord): ResumeRecord {
    return ResumeManager.saveResumeState(record);
  },

  getState(filePath: string): ResumeRecord | null {
    return ResumeManager.getResumeState(filePath);
  },

  removeState(filePath: string): void {
    ResumeManager.removeResumeState(filePath);
  },

  clearAll(): void {
    ResumeManager.clearAllHistory();
  },

  getRecentHistory(limit = 15, category?: ResumeCategory): ResumeRecord[] {
    return ResumeManager.getRecentHistory(limit, category);
  },

  getAllResumeRecords(category?: ResumeCategory): ResumeRecord[] {
    return ResumeManager.getAllResumeRecords(category);
  },

  getUnfinishedRecords(category?: ResumeCategory): ResumeRecord[] {
    return ResumeManager.getUnfinishedRecords(category);
  },
};

export const resumeRepository = ResumeRepository;
export default ResumeRepository;
