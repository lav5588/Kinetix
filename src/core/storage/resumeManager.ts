import { resumeStorage } from './mmkv';
import type { ResumeRecord } from './types';

export type ResumeCategory = ResumeRecord['category'];

const getResumeKey = (filePath: string): string => `resume:${filePath}`;

const normalizeResumeRecord = (record: ResumeRecord): ResumeRecord => {
  const normalized: ResumeRecord = { ...record };

  if (
    typeof normalized.positionMs === 'number' &&
    typeof normalized.durationMs === 'number' &&
    normalized.durationMs > 0
  ) {
    const progressRatio = normalized.positionMs / normalized.durationMs;

    if (progressRatio >= 0.97) {
      normalized.positionMs = 0;
      normalized.isCompleted = true;
    }
  }

  return normalized;
};

export const ResumeManager = {
  saveResumeState(record: ResumeRecord): ResumeRecord {
    const normalized = normalizeResumeRecord(record);
    resumeStorage.set(getResumeKey(record.filePath), JSON.stringify(normalized));
    return normalized;
  },

  getResumeState(filePath: string): ResumeRecord | null {
    const raw = resumeStorage.getString(getResumeKey(filePath));
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as ResumeRecord;
    } catch {
      return null;
    }
  },

  getRecentHistory(limit = 15, category?: ResumeCategory): ResumeRecord[] {
    const keys = resumeStorage.getAllKeys().filter((key) => key.startsWith('resume:'));
    const records: ResumeRecord[] = [];

    for (const key of keys) {
      const raw = resumeStorage.getString(key);
      if (!raw) {
        continue;
      }

      try {
        const record = JSON.parse(raw) as ResumeRecord;
        if (category && record.category !== category) {
          continue;
        }
        records.push(record);
      } catch {
        // ignore malformed resume entries during history scans
      }
    }

    records.sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0));
    return records.slice(0, limit);
  },

  removeResumeState(filePath: string): void {
    resumeStorage.delete(getResumeKey(filePath));
  },

  clearAllHistory(): void {
    const keys = resumeStorage.getAllKeys();
    for (const key of keys) {
      if (key.startsWith('resume:')) {
        resumeStorage.delete(key);
      }
    }
  },

  isUnfinished(record?: ResumeRecord | null): boolean {
    if (!record || record.isCompleted) {
      return false;
    }

    if (
      typeof record.positionMs === 'number' &&
      typeof record.durationMs === 'number' &&
      record.durationMs > 0
    ) {
      const progressRatio = record.positionMs / record.durationMs;
      return record.positionMs > 0 && progressRatio < 0.97;
    }

    if (typeof record.positionMs === 'number' && record.positionMs > 0) {
      return true;
    }

    if (typeof record.pdfPage === 'number' && record.pdfPage > 1) {
      if (typeof record.pdfTotalPages === 'number' && record.pdfTotalPages > 0) {
        return record.pdfPage < record.pdfTotalPages;
      }
      return true;
    }

    return false;
  },

  getAllResumeRecords(category?: ResumeCategory): ResumeRecord[] {
    const keys = resumeStorage.getAllKeys().filter((key) => key.startsWith('resume:'));
    const records: ResumeRecord[] = [];

    for (const key of keys) {
      const raw = resumeStorage.getString(key);
      if (!raw) {
        continue;
      }

      try {
        const record = JSON.parse(raw) as ResumeRecord;
        if (category && record.category !== category) {
          continue;
        }
        records.push(record);
      } catch {
        // ignore malformed resume entries during history scans
      }
    }

    return records;
  },

  getUnfinishedRecords(category?: ResumeCategory): ResumeRecord[] {
    return this.getAllResumeRecords(category).filter((record) => this.isUnfinished(record));
  },
};

export const resumeManager = ResumeManager;
export default resumeManager;
