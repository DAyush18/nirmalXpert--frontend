import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { authApi } from "@/api/auth.api";
import { completeAuth, errorMessage } from "@/lib/authFlow";

export default function VerifyOtpScreen() {
  const router = useRouter();

  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // The code was just sent. The backend allows a new one after 60 seconds
  // (resendAfterSeconds), and a code lasts 5 minutes / 5 wrong attempts.
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const resendOtp = async () => {
    if (resending || secondsLeft > 0) return;

    try {
      setResending(true);

      const data = await authApi.sendOtp(phone);

      setOtp("");
      setSecondsLeft(Number(data?.resendAfterSeconds) || 60);
      Alert.alert("Code sent", "We sent you a new OTP.");
    } catch (error) {
      Alert.alert("Unable to resend", errorMessage(error));
    } finally {
      setResending(false);
    }
  };

  const verifyOtp = async () => {
    if (loading) return;

    if (otp.length !== 6) {
      Alert.alert("Error", "Enter a valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);

      // Existing number -> session (the route guards take over, no role screen).
      // New number     -> registrationToken, then role selection.
      const result = await authApi.verifyOtp(phone, otp);

      await completeAuth(result, router);
    } catch (error) {
      console.error("OTP verification error:", error);
      Alert.alert(
        "Verification failed",
        errorMessage(error, "Invalid or expired OTP"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 justify-center bg-white px-6">
      <Text className="mb-2 text-2xl font-bold">Verify your mobile number</Text>

      <Text className="mb-6 text-gray-500">Enter the OTP sent to {phone}</Text>

      <TextInput
        className="mb-4 rounded-xl border border-slate-200 p-4 text-center"
        placeholder="Enter OTP"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        maxLength={6}
      />

      <TouchableOpacity
        onPress={verifyOtp}
        disabled={loading}
        className={`items-center rounded-xl py-4 ${
          loading ? "bg-orange-300" : "bg-orange-500"
        }`}
      >
        <Text className="font-bold text-white">
          {loading ? "Verifying..." : "Verify OTP"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={resendOtp}
        disabled={secondsLeft > 0 || resending}
        className="mt-4 items-center"
      >
        <Text
          className={`text-sm font-semibold ${
            secondsLeft > 0 || resending ? "text-slate-400" : "text-orange-500"
          }`}
        >
          {resending
            ? "Sending..."
            : secondsLeft > 0
              ? `Resend code in ${secondsLeft}s`
              : "Resend code"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace("/(auth)/phone")}
        className="mt-2 items-center"
      >
        <Text className="text-sm text-slate-500">Wrong number? Change it</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
