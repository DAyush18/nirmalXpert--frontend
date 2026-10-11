import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { authApi } from "@/api/auth.api";
import { errorMessage } from "@/lib/authFlow";

export default function PhoneScreen() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // replace: once the OTP screen takes over, this screen must not stay
  // underneath it in the history.
  const goToVerify = () =>
    router.replace({
      pathname: "/(auth)/verify-otp",
      params: { phone: phone.trim() },
    });

  const sendOtp = async () => {
    if (loading) return;

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      Alert.alert("Error", "Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setLoading(true);

      await authApi.sendOtp(phone.trim());

      goToVerify();
    } catch (error) {
      // The backend allows one code per 60 s. If this number just got one
      // ("Please wait N seconds..."), that code is still valid for 5 minutes,
      // so continue to the OTP screen instead of showing an error.
      if (/^please wait \d+ seconds/i.test(errorMessage(error, ""))) {
        goToVerify();
        return;
      }

      console.error("Send OTP error:", error);
      Alert.alert("Error", errorMessage(error, "Failed to send OTP"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 justify-center bg-white px-6">
      <Text className="mb-2 text-2xl font-bold">Enter your mobile number</Text>

      <Text className="mb-6 text-gray-500">
        We will send you an OTP to verify your number.
      </Text>

      <TextInput
        className="mb-4 rounded-xl border border-slate-200 p-4"
        placeholder="Mobile number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        maxLength={10}
      />

      <TouchableOpacity
        onPress={sendOtp}
        disabled={loading}
        className={`items-center rounded-xl py-4 ${
          loading ? "bg-orange-300" : "bg-orange-500"
        }`}
      >
        <Text className="font-bold text-white">
          {loading ? "Sending..." : "Send OTP"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
