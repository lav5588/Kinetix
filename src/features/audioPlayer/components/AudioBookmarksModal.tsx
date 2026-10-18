import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@core/theme';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import { useAudioControlsStore } from '@core/store/useAudioControlsStore';
import { audioPlaybackService } from '../services/AudioPlaybackService';
import type { MediaBookmarkRow } from '@core/storage/types';
import { PressableScale } from '@shared/components/PressableScale';

export const AudioBookmarksModal: React.FC = () => {
  const theme = useAppTheme();
  const isVisible = useAudioControlsStore((state) => state.isBookmarksVisible);
  const setVisible = useAudioControlsStore((state) => state.setBookmarksVisible);
  const activeTrack = useAudioPlayerStore((state) => state.activeTrack);
  const positionMs = useAudioPlayerStore((state) => state.positionMs);

  const bookmarks = useAudioControlsStore((state) => state.bookmarks);
  const loadBookmarks = useAudioControlsStore((state) => state.loadBookmarks);
  const addBookmark = useAudioControlsStore((state) => state.addBookmark);
  const removeBookmark = useAudioControlsStore((state) => state.removeBookmark);

  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const filePath =
    activeTrack?.originalFile?.file_path ?? activeTrack?.url.replace(/^file:\/\//, '') ?? '';

  useEffect(() => {
    if (isVisible && filePath) {
      loadBookmarks(filePath);
      setIsAdding(false);
      setBookmarkTitle('');
    }
  }, [isVisible, filePath, loadBookmarks]);

  const handleSaveBookmark = async () => {
    if (!filePath) return;
    await addBookmark(filePath, positionMs, bookmarkTitle.trim() || undefined);
    setBookmarkTitle('');
    setIsAdding(false);
  };

  const handleSeekToBookmark = async (timestampMs: number) => {
    await audioPlaybackService.seekTo(timestampMs);
    setVisible(false);
  };

  const handleDeleteBookmark = async (id: number) => {
    if (!filePath) return;
    await removeBookmark(id, filePath);
  };

  const formatTimestamp = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
      testID="audio-bookmarks-modal"
    >
      <TouchableWithoutFeedback onPress={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: theme.appColors.surface,
                  borderColor: theme.appColors.border,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <MaterialCommunityIcons
                  name="bookmark-multiple-outline"
                  size={24}
                  color={theme.appColors.primary}
                />
                <Text style={[styles.headerTitle, { color: theme.appColors.textPrimary }]}>
                  Track Bookmarks
                </Text>
                <TouchableOpacity
                  testID="close-bookmarks-modal-btn"
                  onPress={() => setVisible(false)}
                  style={styles.closeBtn}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={22}
                    color={theme.appColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Pin Current Time Button */}
              {!isAdding ? (
                <PressableScale
                  testID="pin-current-time-btn"
                  onPress={() => setIsAdding(true)}
                  style={[styles.pinButton, { backgroundColor: theme.appColors.primary }]}
                >
                  <MaterialCommunityIcons name="bookmark-plus" size={20} color="#FFFFFF" />
                  <Text style={styles.pinButtonText}>Pin at {formatTimestamp(positionMs)}</Text>
                </PressableScale>
              ) : (
                <View
                  testID="add-bookmark-form"
                  style={[
                    styles.addForm,
                    {
                      backgroundColor: theme.appColors.surfaceVariant ?? '#F8FAFC',
                      borderColor: theme.appColors.border,
                    },
                  ]}
                >
                  <Text style={[styles.addFormTitle, { color: theme.appColors.textPrimary }]}>
                    Pin at {formatTimestamp(positionMs)}
                  </Text>
                  <TextInput
                    testID="bookmark-title-input"
                    value={bookmarkTitle}
                    onChangeText={setBookmarkTitle}
                    placeholder="Bookmark note or title (optional)"
                    placeholderTextColor={theme.appColors.textSecondary}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.appColors.surface,
                        color: theme.appColors.textPrimary,
                        borderColor: theme.appColors.border,
                      },
                    ]}
                  />
                  <View style={styles.formActions}>
                    <TouchableOpacity onPress={() => setIsAdding(false)} style={styles.cancelBtn}>
                      <Text style={{ color: theme.appColors.textSecondary }}>Cancel</Text>
                    </TouchableOpacity>
                    <PressableScale
                      testID="save-bookmark-btn"
                      onPress={handleSaveBookmark}
                      style={[styles.saveBtn, { backgroundColor: theme.appColors.primary }]}
                    >
                      <Text style={styles.saveBtnText}>Save</Text>
                    </PressableScale>
                  </View>
                </View>
              )}

              {/* Bookmarks List */}
              <FlatList
                data={bookmarks}
                keyExtractor={(item) => String(item.id)}
                testID="bookmarks-list"
                style={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.appColors.textSecondary }]}>
                      No bookmarks saved for this track yet.
                    </Text>
                  </View>
                }
                renderItem={({ item }: { item: MediaBookmarkRow }) => (
                  <View
                    testID={`bookmark-item-${item.id}`}
                    style={[
                      styles.bookmarkItem,
                      {
                        borderColor: theme.appColors.border,
                        backgroundColor: theme.appColors.surface,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      testID={`seek-bookmark-${item.id}`}
                      onPress={() => handleSeekToBookmark(item.timestamp_ms)}
                      style={styles.bookmarkContent}
                    >
                      <View
                        style={[
                          styles.timestampBadge,
                          { backgroundColor: theme.appColors.secondaryContainer },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={14}
                          color={theme.appColors.primary}
                        />
                        <Text style={[styles.timestampText, { color: theme.appColors.primary }]}>
                          {formatTimestamp(item.timestamp_ms)}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[styles.bookmarkLabel, { color: theme.appColors.textPrimary }]}
                      >
                        {item.title}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      testID={`delete-bookmark-${item.id}`}
                      onPress={() => handleDeleteBookmark(item.id)}
                      style={styles.deleteBtn}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={20}
                        color={theme.appColors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '80%',
    minHeight: 350,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  closeBtn: {
    padding: 4,
  },
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  pinButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },
  addForm: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  addFormTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  list: {
    marginTop: 4,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  bookmarkContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
    gap: 4,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bookmarkLabel: {
    flex: 1,
    fontSize: 14,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
  },
});

export default AudioBookmarksModal;
