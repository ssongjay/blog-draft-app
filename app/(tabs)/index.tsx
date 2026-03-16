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
      if (isConfigured) {
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
        onPress={() => router.push("/new-draft")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
});
