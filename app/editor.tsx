import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { githubService } from "../services/github";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    path?: string;
    name?: string;
    category?: string;
  }>();

  const [content, setContent] = useState("");
  const [sha, setSha] = useState<string | undefined>();
  const [loading, setLoading] = useState(!!params.path);
  const [saving, setSaving] = useState(false);
  const isExisting = !!params.path;

  useEffect(() => {
    if (params.path) {
      (async () => {
        try {
          const result = await githubService.getDraftContent(params.path!);
          setContent(result.content);
          setSha(result.sha);
        } catch (e: any) {
          Alert.alert("불러오기 실패", e.message);
          router.back();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [params.path]);

  const handleSave = async () => {
    if (!params.path) return;
    setSaving(true);
    try {
      const result = await githubService.saveDraft(params.path, content, sha);
      setSha(result.sha);
      Alert.alert("저장 완료", "GitHub에 커밋되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("저장 실패", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!params.path || !sha) return;
    Alert.alert("초안 삭제", `"${params.name}"을(를) 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await githubService.deleteDraft(params.path!, sha);
            router.back();
          } catch (e: any) {
            Alert.alert("삭제 실패", e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>돌아가기</Text>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {isExisting && (
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveText}>저장</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaCategory}>{params.category}</Text>
        <Text style={styles.metaTitle}>{params.name}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.editorWrapper}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <TextInput
          style={styles.editor}
          value={content}
          onChangeText={setContent}
          placeholder="마크다운으로 초안을 작성하세요..."
          placeholderTextColor="#C7C7CC"
          multiline
          textAlignVertical="top"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  backText: { fontSize: 16, color: "#007AFF", marginLeft: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },

  meta: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  metaCategory: { fontSize: 13, color: "#007AFF", fontWeight: "600", marginBottom: 2 },
  metaTitle: { fontSize: 22, fontWeight: "700", color: "#1C1C1E" },

  editorWrapper: { flex: 1 },
  editor: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    color: "#1C1C1E",
  },
});
