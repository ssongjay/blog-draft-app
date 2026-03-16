import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppSettings, DEFAULT_SETTINGS, LocalDraft } from "../types";

const KEYS = {
  TOKEN: "github_token",
  SETTINGS: "app_settings",
  LOCAL_DRAFTS: "local_drafts",
};

/**
 * 로컬 스토리지 서비스
 * - GitHub 토큰은 SecureStore (암호화)
 * - 나머지 설정과 초안은 AsyncStorage
 */
export const storage = {
  /** GitHub 토큰 저장 (암호화) */
  async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.TOKEN, token);
  },

  /** GitHub 토큰 조회 */
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.TOKEN);
  },

  /** GitHub 토큰 삭제 */
  async deleteToken(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.TOKEN);
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
