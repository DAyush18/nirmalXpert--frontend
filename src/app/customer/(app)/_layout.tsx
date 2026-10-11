import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

// Moved from app/customer/_layout.tsx so onboarding is not one of the tabs.
// URLs are unchanged (/customer/home, /customer/profile).
export default function CustomerAppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#f97316" }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
