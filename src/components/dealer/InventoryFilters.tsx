import { Ionicons } from "@expo/vector-icons";
import { FlatList, Modal, Pressable, Text, View } from "react-native";

/** Rounded dropdown button ("All Categories v"). */
export function FilterPill({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-between rounded-full border px-4 py-2.5 ${
        active ? "border-[#FF641F] bg-orange-50" : "border-gray-200 bg-white"
      }`}
    >
      <Text
        numberOfLines={1}
        className={`mr-2 flex-1 text-xs ${active ? "font-semibold text-[#FF641F]" : "text-gray-600"}`}
      >
        {label}
      </Text>
      <Ionicons name="chevron-down" size={14} color={active ? "#FF641F" : "#6B7280"} />
    </Pressable>
  );
}

export type PickerOption = { value: string; label: string };

/** Bottom-sheet list used by both dropdowns. */
export function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        {/* the inner Pressable swallows taps so only the backdrop closes the sheet */}
        <Pressable className="max-h-[70%] rounded-t-3xl bg-white px-4 pb-8 pt-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[17px] font-bold text-[#071226]">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </Pressable>
          </View>

          <FlatList
            data={options}
            keyExtractor={(option: PickerOption) => option.value}
            renderItem={({ item }: { item: PickerOption }) => {
              const isSelected = item.value === selected;

              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  className="flex-row items-center justify-between border-b border-gray-100 py-3.5"
                >
                  <Text
                    className={`text-[15px] ${
                      isSelected ? "font-semibold text-[#FF641F]" : "text-[#071226]"
                    }`}
                  >
                    {item.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#FF641F" />}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
