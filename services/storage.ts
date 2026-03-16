import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { AppSettings, DEFAULT_SETTINGS, LocalDraft } from "../types";

const KEYS = {
  TOKEN: "github_token",
  SETTINGS: "app_settings",
  LOCAL_DRAFTS: "local_drafts",
};

async function getSecureStore() {
  if (Platform.OS === "web") return null;
  return await import("expo-secure-store");
}

export const storage = {
  async saveToken(token: string): Promise<void> {
    const SecureStore = await getSecureStore();
    if (SecureStore) {
      await SecureStore.setItemAsync(KEYS.TOKEN, token);
    } else {
      await AsyncStorage.setItem(KEYS.TOKEN, token);
    }
  },

  async getToken(): Promise<string | null> {
    const SecureStore = await getSecureStore();
    if (SecureStore) {
      return SecureStore.getItemAsync(KEYS.TOKEN);
    }
    return AsyncStorage.getItem(KEYS.TOKEN);
  },

  async deleteToken(): Promise<void> {
    const SecureStore = await getSecureStore();
    if (SecureStore) {
      await SecureStore.deleteItemAsync(KEYS.TOKEN);
    } else {
      await AsyncStorage.removeItem(KEYS.TOKEN);
    }
  },

  /** 앱 설정 저장 */
  async saveSettings(settings: Omit<AppSettings, "token">): Promise<void> {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  /** 앱 설정 조회 */
  async getSettings(): Promise<Omit<AppSettings, "token">> {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return JSON.parse(raw);
  },

  /** 전체 설정 (토큰 포함) 조회 */
  async getFullSettings(): Promise<AppSettings | null> {
    const [token, settings] = await Promise.all([
      storage.getToken(),
      storage.getSettings(),
    ]);

    if (!token) return null;
    return { ...settings, token };
  },

  /** 로컬 초안 목록 저장 */
  async saveLocalDrafts(drafts: LocalDraft[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.LOCAL_DRAFTS, JSON.stringify(drafts));
  },

  /** 로컬 초안 목록 조회 */
  async getLocalDrafts(): Promise<LocalDraft[]> {
    const raw = await AsyncStorage.getItem(KEYS.LOCAL_DRAFTS);
    if (!raw) return [];
    return JSON.parse(raw);
  },
};
