import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { githubService } from "../services/github";
import { storage } from "../services/storage";
import { Category } from "../types";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function NewDraftScreen() {
  const router = useRouter();
  const [newCategory, setNewCategory] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (githubService.isConfigured) {
      githubService.getCategories().then(setCategories).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      LayoutAnimation.configureNext({
        duration: e.duration,
        update: { type: LayoutAnimation.Types.keyboard },
      });
      setKeyboardOffset(e.endCoordinates.height / 2);
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", (e) => {
      LayoutAnimation.configureNext({
        duration: e.duration,
        update: { type: LayoutAnimation.Types.keyboard },
      });
      setKeyboardOffset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const dismiss = () => {
    Keyboard.dismiss();
    router.back();
  };

  const handleCreate = async () => {
    const category = newCategory.trim();
    const title = newTitle.trim();
    if (!category || !title) {
      Alert.alert("입력 오류", "카테고리와 제목을 모두 입력하세요.");
      return;
    }
    setCreating(true);
    try {
      const settings = await storage.getSettings();
      const filePath = `${settings.basePath}/${category}/${title}.md`;
      await githubService.saveDraft(filePath, `# ${title}\n\n`, undefined, `create: ${title}`);
      router.back();
    } catch (e: any) {
      Alert.alert("생성 실패", e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={dismiss}>
      <View style={[styles.dialog, { marginBottom: keyboardOffset }]}>
        <TouchableOpacity activeOpacity={1}>
          <Text style={styles.title}>새 초안</Text>

          <Text style={styles.label}>카테고리</Text>
          <TextInput
            style={styles.input}
            value={newCategory}
            onChangeText={setNewCategory}
            placeholder="예: 의료_의약"
            placeholderTextColor="#C7C7CC"
            autoCapitalize="none"
          />

          {categories.length > 0 && (
            <View style={styles.chips}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.path}
                  style={[styles.chip, newCategory === c.name && styles.chipActive]}
                  onPress={() => setNewCategory(c.name)}
                >
                  <Text style={[styles.chipText, newCategory === c.name && styles.chipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.input}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="예: 치매는 왜 생기는가"
            placeholderTextColor="#C7C7CC"
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={dismiss}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createText}>생성</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#1C1C1E", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: "#8E8E93", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#1C1C1E",
    backgroundColor: "#F2F2F7",
    marginBottom: 16,
  },
  chips: {
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
  buttons: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
  },
  cancelText: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  createBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  createText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
