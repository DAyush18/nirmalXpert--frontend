import { SafeAreaView, Text, TouchableOpacity } from "react-native";

import { useAuthStore } from "@/store/auth.store";

export default function DealerProfile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-slate-100">
      <Text className="text-[23px] font-bold text-slate-800">{user?.name ?? "Dealer"}</Text>
      <TouchableOpacity
        onPress={logout}
        className="mt-6 rounded-xl bg-orange-500 px-8 py-4"
      >
        <Text className="text-[13px] font-bold text-white">Log out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
