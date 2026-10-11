import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, SafeAreaView, Text, View } from "react-native";

import { RiderList } from "@/components/dealer/RiderList";

/** Orders -> Logistics Partners: manage your drivers. */
export default function LogisticsPartnersScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      <View className="flex-row items-center px-4 pb-1 pt-4">
        <Pressable onPress={() => router.back()} hitSlop={10} className="mr-2">
          <Ionicons name="chevron-back" size={24} color="#071226" />
        </Pressable>
        <Text className="text-[18px] font-bold text-[#071226]">Logistics Partners</Text>
      </View>

      <RiderList mode="manage" />
    </SafeAreaView>
  );
}
