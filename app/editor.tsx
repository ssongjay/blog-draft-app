import { useState, useEffect, useRef } from "react";
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
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { githubService } from "../services/github";
import { SafeAreaView } from "react-native-safe-area-context";
import { Markdown } from "@docren/react-native-markdown";

type EditorTab = "edit" | "preview";

const TOOLBAR_ACTIONS = [
  { label: "H1", prefix: "# ", suffix: "", block: true },
  { label: "H2", prefix: "## ", suffix: "", block: true },
  { label: "B", prefix: "**", suffix: "**", block: false },
  { label: "I", prefix: "_", suffix: "_", block: false },
  { label: "~", prefix: "~~", suffix: "~~", block: false },
  { label: "•", prefix: "- ", suffix: "", block: true },
  { label: "1.", prefix: "1. ", suffix: "", block: true },
  { label: "<>", prefix: "`", suffix: "`", block: false },
  { label: "🔗", prefix: "[", suffix: "](url)", block: false },
  { label: "📷", prefix: "![", suffix: "](url)", block: false },
  { label: "─", prefix: "\n---\n", suffix: "", block: false },
];

export default function EditorScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const params = useLocalSearchParams<{
    path?: string;
    name?: string;
    category?: string;
  }>();

  const [content, setContent] = useState("");
  const [sha, setSha] = useState<string | undefined>();
  const [loading, setLoading] = useState(!!params.path);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<EditorTab>("edit");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
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

  const applyFormat = (prefix: string, suffix: string, block: boolean) => {
    const { start, end } = selection;
    const selected = content.slice(start, end);

    let newText: string;
    let newCursor: number;

    if (block) {
      const lineStart = content.lastIndexOf("\n", start - 1) + 1;
      newText = content.slice(0, lineStart) + prefix + content.slice(lineStart);
      newCursor = start + prefix.length;
    } else if (selected) {
      newText = content.slice(0, start) + prefix + selected + suffix + content.slice(end);
      newCursor = end + prefix.length + suffix.length;
    } else {
      newText = content.slice(0, start) + prefix + suffix + content.slice(start);
      newCursor = start + prefix.length;
    }

    setContent(newText);
    setSelection({ start: newCursor, end: newCursor });
    inputRef.current?.focus();
  };

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

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === "edit" && styles.tabActive]}
          onPress={() => setTab("edit")}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={tab === "edit" ? "#007AFF" : "#8E8E93"}
          />
          <Text style={[styles.tabText, tab === "edit" && styles.tabTextActive]}>편집</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "preview" && styles.tabActive]}
          onPress={() => setTab("preview")}
        >
          <Ionicons
            name="eye-outline"
            size={16}
            color={tab === "preview" ? "#007AFF" : "#8E8E93"}
          />
          <Text style={[styles.tabText, tab === "preview" && styles.tabTextActive]}>미리보기</Text>
        </TouchableOpacity>
      </View>

      {tab === "edit" ? (
        <KeyboardAvoidingView
          style={styles.editorWrapper}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={styles.toolbarContent}
            style={styles.toolbar}
          >
            {TOOLBAR_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.toolBtn}
                onPress={() => applyFormat(action.prefix, action.suffix, action.block)}
              >
                <Text style={styles.toolBtnText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            ref={inputRef}
            style={styles.editor}
            value={content}
            onChangeText={setContent}
            onSelectionChange={({ nativeEvent: { selection: sel } }) => setSelection(sel)}
            placeholder="마크다운으로 초안을 작성하세요..."
            placeholderTextColor="#C7C7CC"
            multiline
            textAlignVertical="top"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </KeyboardAvoidingView>
      ) : (
        <ScrollView style={styles.previewWrapper} contentContainerStyle={styles.previewContent}>
          {content.trim() ? (
            <Markdown markdown={content} />
          ) : (
            <Text style={styles.previewEmpty}>작성된 내용이 없습니다</Text>
          )}
        </ScrollView>
      )}
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  metaCategory: { fontSize: 13, color: "#007AFF", fontWeight: "600", marginBottom: 2 },
  metaTitle: { fontSize: 20, fontWeight: "700", color: "#1C1C1E" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: { fontSize: 14, fontWeight: "600", color: "#8E8E93" },
  tabTextActive: { color: "#007AFF" },

  toolbar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    backgroundColor: "#F9F9FB",
    maxHeight: 44,
  },
  toolbarContent: {
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 6,
  },
  toolBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  toolBtnText: { fontSize: 14, fontWeight: "700", color: "#1C1C1E" },

  editorWrapper: { flex: 1 },
  editor: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    color: "#1C1C1E",
  },

  previewWrapper: { flex: 1 },
  previewContent: { padding: 16 },
  previewEmpty: { fontSize: 15, color: "#C7C7CC", textAlign: "center", marginTop: 40 },
});
