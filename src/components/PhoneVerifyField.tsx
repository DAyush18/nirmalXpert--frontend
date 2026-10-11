import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";

import { authApi } from "@/api/auth.api";
import { errorMessage } from "@/lib/authFlow";
import { formatPhone, normalizePhone } from "@/lib/orders";
import {
  formatCountdown,
  OTP_LENGTH,
  parseCooldownSeconds,
  sanitizeOtp,
} from "@/lib/phoneVerify";
import { useAuthStore } from "@/store/auth.store";

/**
 * "Primary Mobile Number *"
 *   signed in with a phone number -> already verified, shown read-only
 *   signed in with Google (no phone) -> enter a number, Send OTP, type the 6 digits
 *
 * Verifying saves the number on the account (POST /auth/phone/verify) and updates
 * the signed-in user, so the field flips to the verified view by itself.
 */
export function PhoneVerifyField() {
  const phone = useAuthStore((state) => state.user?.phone);

  return phone ? <VerifiedPhone phone={phone} /> : <PhoneVerification />;
}

function Label() {
  return (
    <Text className="mb-2 text-sm font-semibold text-[#111827]">
      Primary Mobile Number <Text className="text-red-500">*</Text>
    </Text>
  );
}

function VerifiedPhone({ phone }: { phone: string }) {
  return (
    <View className="mb-4">
      <Label />

      <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-100 px-4 py-3.5">
        <Text className="flex-1 text-[#111827]">{formatPhone(phone)}</Text>

        <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
        <Text className="ml-1 text-xs font-semibold text-green-600">Verified</Text>
      </View>
    </View>
  );
}

function PhoneVerification() {
  const [input, setInput] = useState("");
  /** The number the code was sent to (the code only works for this number). */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const otpInput = useRef<TextInput>(null);

  // resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const onChangeNumber = (text: string) => {
    setInput(text);

    // a different number needs its own code
    if (sentTo && normalizePhone(text) !== sentTo) {
      setSentTo(null);
      setOtp("");
      setSecondsLeft(0);
    }
  };

  const sendOtp = async () => {
    if (sending || verifying) return;

    const phone = normalizePhone(input);
    if (!phone) {
      Alert.alert("Mobile number", "Enter a valid 10-digit Indian mobile number.");
      return;
    }

    try {
      setSending(true);

      const data = await authApi.sendPhoneOtp(phone);

      setSentTo(phone);
      setOtp("");
      setSecondsLeft(Number(data?.resendAfterSeconds) || 60);
      setTimeout(() => otpInput.current?.focus(), 100);
    } catch (error) {
      // "Please wait N seconds": a code was just sent and is still valid
      const wait = parseCooldownSeconds(errorMessage(error, ""));

      if (wait !== null) {
        setSentTo(phone);
        setOtp("");
        setSecondsLeft(wait);
        setTimeout(() => otpInput.current?.focus(), 100);
        return;
      }

      // e.g. 409 "This number is already linked to another account"
      Alert.alert("Unable to send OTP", errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const verify = async (code: string) => {
    if (verifying || !sentTo) return;

    try {
      setVerifying(true);

      await authApi.verifyPhone(sentTo, code);

      // the account has a verified number now, so the field turns into the verified view
      useAuthStore.getState().updateUser({ phone: sentTo });
    } catch (error) {
      Alert.alert("Verification failed", errorMessage(error, "Invalid or expired OTP"));
      setOtp("");
      otpInput.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const onChangeOtp = (text: string) => {
    const code = sanitizeOtp(text);
    setOtp(code);

    if (code.length === OTP_LENGTH) void verify(code); // verifies as soon as the 6th digit is in
  };

  const canResend = secondsLeft <= 0 && !sending && !verifying;

  return (
    <View className="mb-4">
      <Label />

      <View className="flex-row items-center">
        <View className="mr-2 flex-1 flex-row items-center rounded-xl border border-gray-200 bg-[#F8FAFC] px-4">
          <Text className="mr-2 text-sm text-gray-500">+91</Text>
          <TextInput
            value={input}
            onChangeText={onChangeNumber}
            placeholder="98765 43210"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            maxLength={16}
            className="flex-1 py-3.5 text-[#111827]"
          />
        </View>

        <Pressable
          onPress={sendOtp}
          disabled={sending || verifying || (!!sentTo && secondsLeft > 0)}
          className={`h-[50px] items-center justify-center rounded-xl px-4 ${
            sending || (sentTo && secondsLeft > 0) ? "bg-orange-300" : "bg-[#FF641F]"
          }`}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-sm font-bold text-white">{sentTo ? "Sent" : "Send OTP"}</Text>
          )}
        </Pressable>
      </View>

      {sentTo && (
        <View className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-[#111827]">
              Enter 6-digit OTP <Text className="text-red-500">*</Text>
            </Text>
            <Text className="text-xs font-semibold text-orange-500">
              {formatCountdown(secondsLeft)}
            </Text>
          </View>

          {/* Six boxes drawn over ONE invisible input, so paste and SMS autofill work. */}
          <Pressable onPress={() => otpInput.current?.focus()} className="mt-3">
            <View className="flex-row">
              {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                <View
                  key={index}
                  className={`mx-1 h-11 flex-1 items-center justify-center rounded-xl border bg-white ${
                    otp.length === index ? "border-[#FF641F]" : "border-gray-200"
                  }`}
                >
                  <Text className="text-base font-bold text-[#111827]">{otp[index] ?? ""}</Text>
                </View>
              ))}
            </View>

            <TextInput
              ref={otpInput}
              value={otp}
              onChangeText={onChangeOtp}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              editable={!verifying}
              caretHidden
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              style={{ position: "absolute", width: "100%", height: "100%", opacity: 0 }}
            />
          </Pressable>

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-xs text-gray-500">
              {verifying ? "Verifying..." : `Code sent to +91 ${sentTo}`}
            </Text>

            <Pressable onPress={sendOtp} disabled={!canResend} hitSlop={8}>
              <Text
                className={`text-xs font-semibold ${canResend ? "text-[#FF641F]" : "text-gray-400"}`}
              >
                Resend OTP
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
