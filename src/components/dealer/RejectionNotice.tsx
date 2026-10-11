import { Text, View } from "react-native";

import { getStepNotices, type StepKey } from "@/lib/dealerFlow";
import { useDealerStore } from "@/store/dealer.store";

/** Shows the reviewer's reason(s) on the step that has to be corrected. */
export function RejectionNotice({
  step,
  className = "mb-4",
}: {
  step: StepKey;
  className?: string;
}) {
  const me = useDealerStore((state) => state.me);
  const notices = me ? getStepNotices(me, step) : [];

  if (notices.length === 0) return null;

  return (
    <View className={`rounded-2xl border border-red-200 bg-red-50 p-4 ${className}`}>
      <Text className="font-bold text-red-800">Needs your attention</Text>

      {notices.map((notice) => (
        <Text key={notice} className="mt-2 text-sm leading-5 text-red-700">
          • {notice}
        </Text>
      ))}
    </View>
  );
}
