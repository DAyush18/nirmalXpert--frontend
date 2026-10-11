import { Stack } from "expo-router";

// Orders tab: list -> [orderId] (detail), assign/[orderId] (pick a rider),
// riders (manage logistics partners) -> riders/form (add / edit).
export default function OrdersLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
