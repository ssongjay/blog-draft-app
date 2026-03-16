import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { githubService } from "../../services/github";
import { Category, Draft } from "../../types";
import { useAppContext } from "../_layout";

interface CategoryWithDrafts {
  category: Category;
  drafts: Draft[];
  expanded: boolean;
}

export default function HomeScreen() {
  const router = useRouter();
  const { isConfigured } = useAppContext();
  const [data, setData] = useState<CategoryWithDrafts[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewDraft, setShowNewDraft] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!githubService.isConfigured) return;
    try {
      const results = await githubService.getAllDrafts();
      setData(
        results.map((r) => ({
          ...r,
          expanded: true,
        }))
      );
    } catch (e: any) {
      Alert.alert("동기화 실패", e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isConfigured && data.length === 0) {
        setLoading(true);
        fetchData().finally(() => setLoading(false));
      }
    }, [isConfigured])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggleCategory = (index: number) => {
    setData((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  const handleCreateDraft = async () => {
    const category = newCategory.trim();
    const title = newTitle.trim();
    if (!category || !title) {
      Alert.alert("입력 오류", "카테고리와 제목을 모두 입력하세요.");
      return;
    }
    setCreating(true);
    try {
      const settings = await (await import("../../services/storage")).storage.getSettings();
      const filePath = `${settings.basePath}/${category}/${title}.md`;
      await githubService.saveDraft(filePath, `# ${title}\n\n`, undefined, `create: ${title}`);
      setShowNewDraft(false);
      setNewCategory("");
      setNewTitle("");
      await fetchData();
    } catch (e: any) {
      Alert.alert("생성 실패", e.message);
    } finally {
      setCreating(false);
    }
  };

  const openEditor = (draft: Draft) => {
    router.push({
      pathname: "/editor",
      params: { path: draft.path, name: draft.name, category: draft.category },
    });
  };

  if (!isConfigured) {
    return (
      <View style={styles.centered}>
        <Ionicons name="settings-outline" size={48} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>설정이 필요합니다</Text>
        <Text style={styles.emptySubtitle}>
          설정 탭에서 GitHub 토큰과 레포 정보를 입력하세요
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>초안 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.category.path}
        contentContainerStyle={data.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#007AFF" />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="document-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>초안이 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              + 버튼을 눌러 첫 초안을 작성하세요
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.categorySection}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(index)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.expanded ? "chevron-down" : "chevron-forward"}
                size={18}
                color="#8E8E93"
              />
              <Ionicons
                name="folder-outline"
                size={20}
                color="#007AFF"
                style={{ marginLeft: 6 }}
              />
              <Text style={styles.categoryName}>{item.category.name}</Text>
              <Text style={styles.draftCount}>{item.drafts.length}</Text>
            </TouchableOpacity>

            {item.expanded &&
              item.drafts.map((draft) => (
                <TouchableOpacity
                  key={draft.path}
                  style={styles.draftItem}
                  onPress={() => openEditor(draft)}
                  activeOpacity={0.6}
                >
                  <Ionicons name="document-text-outline" size={18} color="#8E8E93" />
                  <Text style={styles.draftName} numberOfLines={1}>
                    {draft.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                </TouchableOpacity>
              ))}
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewDraft(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={showNewDraft} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새 초안</Text>

            <Text style={styles.modalLabel}>카테고리</Text>
            <TextInput
              style={styles.modalInput}
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="예: 의료_의약"
              placeholderTextColor="#C7C7CC"
              autoCapitalize="none"
            />

            {data.length > 0 && (
              <View style={styles.categoryChips}>
                {data.map((d) => (
                  <TouchableOpacity
                    key={d.category.path}
                    style={[
                      styles.chip,
                      newCategory === d.category.name && styles.chipActive,
                    ]}
                    onPress={() => setNewCategory(d.category.name)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        newCategory === d.category.name && styles.chipTextActive,
                      ]}
                    >
                      {d.category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.modalLabel}>제목</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="예: 치매는 왜 생기는가"
              placeholderTextColor="#C7C7CC"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowNewDraft(false);
                  setNewCategory("");
                  setNewTitle("");
                }}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, creating && { opacity: 0.6 }]}
                onPress={handleCreateDraft}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalCreateText}>생성</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  list: { padding: 16, paddingBottom: 100 },
  emptyList: { flexGrow: 1 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#1C1C1E", marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: "#8E8E93", marginTop: 4, textAlign: "center" },
  loadingText: { fontSize: 14, color: "#8E8E93", marginTop: 12 },

  categorySection: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginLeft: 8,
    flex: 1,
  },
  draftCount: {
    fontSize: 13,
    color: "#8E8E93",
    backgroundColor: "#E5E5EA",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },

  draftItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginLeft: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
  },
  draftName: {
    fontSize: 15,
    color: "#1C1C1E",
    marginLeft: 8,
    flex: 1,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1C1C1E", marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: "600", color: "#8E8E93", marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#1C1C1E",
    backgroundColor: "#F2F2F7",
    marginBottom: 16,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  chipActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  chipText: { fontSize: 13, color: "#1C1C1E" },
  chipTextActive: { color: "#FFFFFF" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
  },
  modalCancelText: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  modalCreate: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  modalCreateText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
