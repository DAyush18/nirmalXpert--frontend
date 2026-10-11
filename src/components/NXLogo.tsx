import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

export default function NXLogo() {
  return (
    <View className="items-center">
      <Svg width={72} height={50} viewBox="0 0 72 50">
        {/* Navy "N" block */}
        <Path
          d="M0 50 V6 H14 L30 26 V6 H44 V50 H30 L14 30 V50 Z"
          fill="#0B4A7A"
        />
        {/* Navy "X" top arms */}
        <Path d="M48 6 H60 L54 16 Z" fill="#0B4A7A" />
        <Path d="M62 6 H72 L58 28 L52 20 Z" fill="#0B4A7A" />
        {/* Orange house-shaped base */}
        <Path d="M42 50 V38 L54 24 L66 38 V50 Z" fill="#F5A33B" />
      </Svg>

      <Text className="mt-1 text-[11px] font-semibold text-slate-700">
        Nirman<Text className="text-orange-500">X</Text>pert
      </Text>
    </View>
  );
}
