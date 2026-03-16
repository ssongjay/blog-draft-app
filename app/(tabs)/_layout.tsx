import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const ACCENT = "#007AFF";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          borderTopColor: "#E5E5EA",
          backgroundColor: "#FBFBFD",
        },
        headerStyle: { backgroundColor: "#FBFBFD" },
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "초안",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
