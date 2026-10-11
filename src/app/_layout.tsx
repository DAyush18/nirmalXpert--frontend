import { Stack } from "expo-router";
import { useEffect } from "react";
import "../../global.css";
import { useAuthStore } from "../store/auth.store";
import { useDealerStore } from "../store/dealer.store";
import { useInventoryStore } from "../store/inventory.store";

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Never let one account's dealer state leak into the next login.
  useEffect(() => {
    if (status === "unauthenticated") {
      useDealerStore.getState().reset();
      useInventoryStore.getState().reset();
    }
  }, [status]);

  if (status === "loading") return null;

  const isAuthed = status === "authenticated";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Logged out */}
      <Stack.Protected guard={!isAuthed}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* One guard per role: each user can only reach their own section */}
      <Stack.Protected guard={isAuthed && role === "DEALER"}>
        <Stack.Screen name="dealer" />
      </Stack.Protected>

      <Stack.Protected guard={isAuthed && role === "CUSTOMER"}>
        <Stack.Screen name="customer" />
      </Stack.Protected>
    </Stack>
  );
}
