// import { Ionicons } from "@expo/vector-icons";
// import { Tabs } from "expo-router";

// // Moved from app/dealer/_layout.tsx. Living in the (app) group keeps the
// // onboarding / verification screens out of the tab bar, and the URLs stay the
// // same (/dealer/home, /dealer/profile).
// export default function DealerAppLayout() {
//   return (
//     <Tabs
//       screenOptions={{ headerShown: false, tabBarActiveTintColor: "#f97316" }}
//     >
//       <Tabs.Screen
//         name="home"
//         options={{
//           title: "Home",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="storefront-outline" color={color} size={size} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="inventory"
//         options={{
//           title: "Inventory",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="cube-outline" color={color} size={size} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="orders"
//         options={{
//           title: "Orders",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="receipt-outline" color={color} size={size} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="profile"
//         options={{
//           title: "Profile",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="person-outline" color={color} size={size} />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// }
// app/(tabs)/inventory/_layout.tsx
import { Stack } from "expo-router";

export default function InventoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-product" />
      <Stack.Screen name="edit/[productId]" />
    </Stack>
  );
}
