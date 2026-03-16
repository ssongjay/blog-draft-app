import { useEffect, useState, createContext, useContext } from "react";
import { Stack } from "expo-router";
import { githubService } from "../services/github";
import { storage } from "../services/storage";

interface AppContextType {
  isConfigured: boolean;
  setIsConfigured: (v: boolean) => void;
}

export const AppContext = createContext<AppContextType>({
  isConfigured: false,
  setIsConfigured: () => {},
});

export const useAppContext = () => useContext(AppContext);

export default function RootLayout() {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await storage.getFullSettings();
      if (settings) {
        githubService.configure(settings);
        setIsConfigured(true);
      }
    })();
  }, []);

  return (
    <AppContext.Provider value={{ isConfigured, setIsConfigured }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="editor"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="new-draft"
          options={{
            presentation: "transparentModal",
            headerShown: false,
            animation: "fade",
          }}
        />
      </Stack>
    </AppContext.Provider>
  );
}
