import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { githubService } from "../../services/github";
import { storage } from "../../services/storage";
import { DEFAULT_SETTINGS } from "../../types";
import { useAppContext } from "../_layout";

export default function SettingsScreen() {
  const { setIsConfigured } = useAppContext();
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState(DEFAULT_SETTINGS.owner);
  const [repo, setRepo] = useState(DEFAULT_SETTINGS.repo);
  const [branch, setBranch] = useState(DEFAULT_SETTINGS.branch);
  const [basePath, setBasePath] = useState(DEFAULT_SETTINGS.basePath);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [savedToken, savedSettings] = await Promise.all([
        storage.getToken(),
        storage.getSettings(),
      ]);
      if (savedToken) setToken(savedToken);
      setOwner(savedSettings.owner);
      setRepo(savedSettings.repo);
      setBranch(savedSettings.branch);
      setBasePath(savedSettings.basePath);
    })();
  }, []);

  const handleTestConnection = async () => {
    if (!token.trim()) {
      Alert.alert("오류", "GitHub 토큰을 입력하세요.");
      return;
    }
    setTesting(true);
    try {
      githubService.configure({ owner, repo, branch, basePath, token });
      const result = await githubService.testConnection();
      Alert.alert(result.success ? "성공" : "실패", result.message);
    } catch (e: any) {
      Alert.alert("오류", e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!token.trim()) {
      Alert.alert("오류", "GitHub 토큰을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        storage.saveToken(token),
        storage.saveSettings({ owner, repo, branch, basePath }),
      ]);
      githubService.configure({ owner, repo, branch, basePath, token });
      setIsConfigured(true);
      Alert.alert("저장 완료", "설정이 저장되었습니다.");
    } catch (e: any) {
      Alert.alert("오류", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>GitHub 인증</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Personal Access Token</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="ghp_xxxxxxxxxxxx"
            placeholderTextColor="#C7C7CC"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            GitHub Settings → Developer settings → Personal access tokens → repo 권한 필요
          </Text>
        </View>

        <Text style={styles.sectionTitle}>레포지토리</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Owner</Text>
          <TextInput
            style={styles.input}
            value={owner}
            onChangeText={setOwner}
            placeholder="ssongjay"
            placeholderTextColor="#C7C7CC"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Repository</Text>
          <TextInput
            style={styles.input}
            value={repo}
            onChangeText={setRepo}
            placeholder="blog-drafts"
            placeholderTextColor="#C7C7CC"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Branch</Text>
            <TextInput
              style={styles.input}
              value={branch}
              onChangeText={setBranch}
              placeholder="main"
              placeholderTextColor="#C7C7CC"
              autoCapitalize="none"
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>초안 폴더</Text>
            <TextInput
              style={styles.input}
              value={basePath}
              onChangeText={setBasePath}
              placeholder="tmp"
              placeholderTextColor="#C7C7CC"
              autoCapitalize="none"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={handleTestConnection}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="#007AFF" />
          ) : (
            <Text style={styles.testButtonText}>연결 테스트</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>저장</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#1C1C1E",
    backgroundColor: "#F2F2F7",
  },
  hint: { fontSize: 12, color: "#8E8E93", marginTop: 4 },
  row: { flexDirection: "row" },
  flex1: { flex: 1 },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  testButton: {
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "#007AFF",
    marginTop: 24,
  },
  testButtonText: { fontSize: 16, fontWeight: "600", color: "#007AFF" },
  saveButton: { backgroundColor: "#007AFF" },
  saveButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
