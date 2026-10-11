import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import { dealerApi } from "@/api/dealer.api";
import { RejectionNotice } from "@/components/dealer/RejectionNotice";
import { PhoneVerifyField } from "@/components/PhoneVerifyField";
import { imageSource, isLocalImage, resolveMediaUrl } from "@/lib/media";
import { useCompleteStep } from "@/lib/useCompleteStep";
import { useAuthStore } from "@/store/auth.store";
import { useDealerStore } from "@/store/dealer.store";

export default function ContactLocationScreen() {
  const completeStep = useCompleteStep("contact");

  const [contactPersonName, setContactPersonName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState("");

  const [photo, setPhoto] = useState<string | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);
  // Phone sign-ups already have a verified number; Google sign-ups must verify one here.
  const phoneVerified = useAuthStore((state) => !!state.user?.phone);

  const [saving, setSaving] = useState(false);

  // Preserve what the dealer already submitted: fill the form from the server
  // profile once (no extra API call, the dealer layout already fetched it).
  const me = useDealerStore((state) => state.me);
  const prefilled = useRef(false);

  useEffect(() => {
    if (prefilled.current || !me?.profile) return;
    prefilled.current = true;

    const profile = me.profile as Record<string, unknown>;
    const text = (value: unknown) => (value == null ? "" : String(value));

    setContactPersonName(text(profile.contactPersonName));
    setBusinessEmail(text(profile.businessEmail));
    setAlternatePhone(text(profile.alternatePhone));
    setAddress(text(profile.address));
    setCity(text(profile.city));
    setState(text(profile.state));
    setPincode(text(profile.pincode));
    setLatitude(text(profile.latitude));
    setLongitude(text(profile.longitude));
    setDeliveryRadiusKm(text(profile.deliveryRadiusKm));

    if (profile.profilePhotoUrl) {
      setPhoto(resolveMediaUrl(String(profile.profilePhotoUrl)));
    }
  }, [me]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    setPhoto(result.assets[0].uri);
  };

  const validate = () => {
    if (!photo) {
      Alert.alert("Required", "Please add a profile photo.");
      return false;
    }

    if (contactPersonName.trim().length < 2) {
      Alert.alert("Required", "Please enter the contact person's name.");
      return false;
    }

    if (!phoneVerified) {
      Alert.alert(
        "Verify your mobile number",
        "Enter your mobile number, tap Send OTP and enter the 6-digit code.",
      );
      return false;
    }

    if (!businessEmail.trim()) {
      Alert.alert("Required", "Please enter your business email.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail.trim())) {
      Alert.alert("Invalid email", "Please enter a valid business email.");
      return false;
    }

    if (
      alternatePhone.trim() &&
      !/^[0-9+\-\s]{6,15}$/.test(alternatePhone.trim())
    ) {
      Alert.alert(
        "Invalid phone",
        "Please enter a valid alternate phone number.",
      );
      return false;
    }

    if (address.trim().length < 5) {
      Alert.alert("Required", "Please enter the complete business address.");
      return false;
    }

    if (city.trim().length < 2) {
      Alert.alert("Required", "Please enter the city.");
      return false;
    }

    if (state.trim().length < 2) {
      Alert.alert("Required", "Please enter the state.");
      return false;
    }

    if (!/^[1-9]\d{5}$/.test(pincode.trim())) {
      Alert.alert("Invalid pincode", "Please enter a valid 6-digit pincode.");
      return false;
    }

    const latitudeValue = Number(latitude);
    const longitudeValue = Number(longitude);

    if (
      !Number.isFinite(latitudeValue) ||
      latitude.trim() === "" ||
      latitudeValue < -90 ||
      latitudeValue > 90
    ) {
      Alert.alert("Invalid location", "Please enter a valid latitude.");
      return false;
    }

    if (
      !Number.isFinite(longitudeValue) ||
      longitude.trim() === "" ||
      longitudeValue < -180 ||
      longitudeValue > 180
    ) {
      Alert.alert("Invalid location", "Please enter a valid longitude.");
      return false;
    }

    const radius = Number(deliveryRadiusKm);

    if (!Number.isInteger(radius) || radius < 1 || radius > 200) {
      Alert.alert(
        "Invalid delivery radius",
        "Delivery radius must be between 1 and 200 km.",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      const payload = {
        contactPersonName: contactPersonName.trim(),

        businessEmail: businessEmail.trim().toLowerCase(),

        ...(alternatePhone.trim()
          ? {
              alternatePhone: alternatePhone.trim(),
            }
          : {}),

        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),

        latitude: Number(latitude),
        longitude: Number(longitude),

        deliveryRadiusKm: Number(deliveryRadiusKm),
      };

      console.log("CONTACT LOCATION PAYLOAD:", payload);

      // Upload the profile photo only if the dealer just picked a new one
      // (a photo already stored on the server comes back as a remote URL).
      if (isLocalImage(photo)) {
        try {
          await dealerApi.uploadProfilePhoto({
            uri: photo,
            name: "dealer-profile.jpg",
            type: "image/jpeg",
          });

          console.log("Profile photo uploaded");
        } catch (uploadError) {
          console.error("Profile photo upload failed:", uploadError);

          Alert.alert(
            "Photo upload failed",
            "We could not upload your profile photo. Please try again or choose a different image.",
          );
          return;
        }
      }

      // Save contact and location
      await dealerApi.updateLocation(payload);

      console.log("Contact and location saved");

      // Refresh the dealer state. The dealer layout then moves the dealer to the
      // right place (status page after submitting, or the next unfinished step).
      const gate = await completeStep();

      // First-time dealer and every step is done: this button is the explicit
      // submit. Afterwards the layout takes them to the verification status page.
      if (gate?.readyToSubmit) {
        await dealerApi.submit();
        await useDealerStore.getState().fetch({ force: true });
      }
    } catch (error) {
      console.error("Contact location error:", error);

      if (axios.isAxiosError(error)) {
        console.log("Status:", error.response?.status);

        console.log("Response:", error.response?.data);

        const message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to complete dealer onboarding.";

        Alert.alert("Unable to continue", message);
      } else {
        Alert.alert(
          "Unable to continue",
          "Something went wrong. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center">
            <Text className="text-[16px] font-bold text-[#111827]">
              Contact & Location
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <Text className="font-bold text-green-600">3</Text>
            </View>

            <View>
              <Text className="font-bold text-green-700">
                Dealer Onboarding
              </Text>

              <Text className="text-xs text-green-600">
                Step 3 of 3 • Contact & Location
              </Text>
            </View>
          </View>
        </View>

        {/* Steps */}
        <View className="mb-4 flex-row gap-2">
          <Step title="Basic Info" />
          <Step title="Verification" />
          <Step title="Contact" active />
        </View>

        <RejectionNotice step="contact" />

        {/* Profile photo */}
        <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-[17px] font-bold text-[#111827]">
            Profile Photo
          </Text>

          <Text className="mb-4 mt-1 text-xs text-gray-500">
            Add a clear photo of the business owner or contact person.
          </Text>

          <Pressable onPress={pickPhoto} className="items-center">
            {photo ? (
              <Image
                source={imageSource(photo, accessToken)}
                className="h-28 w-28 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-28 w-28 items-center justify-center rounded-full border border-dashed border-gray-300 bg-[#F1F4F7]">
                <Text className="text-3xl text-gray-500">⊕</Text>
              </View>
            )}

            <Text className="mt-3 text-sm font-semibold text-[#FF641F]">
              {photo ? "Change photo" : "Add photo"}
            </Text>
          </Pressable>
        </View>

        {/* Contact */}
        <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-[17px] font-bold text-[#111827]">
            Contact Information
          </Text>

          <Text className="mb-5 mt-1 text-xs text-gray-500">
            Provide the primary contact details for your business.
          </Text>

          <Input
            label="Contact Person Name"
            placeholder="Enter contact person's name"
            value={contactPersonName}
            onChangeText={setContactPersonName}
          />

          <PhoneVerifyField />

          <Input
            label="Business Email"
            placeholder="business@example.com"
            value={businessEmail}
            onChangeText={setBusinessEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Alternate Phone"
            placeholder="Optional"
            value={alternatePhone}
            onChangeText={setAlternatePhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Address */}
        <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-[17px] font-bold text-[#111827]">
            Business Address
          </Text>

          <Text className="mb-5 mt-1 text-xs text-gray-500">
            Enter the location from where your business operates.
          </Text>

          <Input
            label="Address"
            placeholder="House/Shop no., street, area"
            value={address}
            onChangeText={setAddress}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="City"
                placeholder="City"
                value={city}
                onChangeText={setCity}
              />
            </View>

            <View className="flex-1">
              <Input
                label="State"
                placeholder="State"
                value={state}
                onChangeText={setState}
              />
            </View>
          </View>

          <Input
            label="Pincode"
            placeholder="6-digit pincode"
            value={pincode}
            onChangeText={setPincode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        {/* Coordinates */}
        <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-[17px] font-bold text-[#111827]">
            Location Coordinates
          </Text>

          <Text className="mb-5 mt-1 text-xs text-gray-500">
            Enter the latitude and longitude of your business location.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Latitude"
                placeholder="e.g. 23.1815"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="decimal-pad"
              />
            </View>

            <View className="flex-1">
              <Input
                label="Longitude"
                placeholder="e.g. 79.9864"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Delivery */}
        <View className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-[17px] font-bold text-[#111827]">
            Delivery Coverage
          </Text>

          <Text className="mb-5 mt-1 text-xs text-gray-500">
            Define how far you can deliver from your business location.
          </Text>

          <Input
            label="Delivery Radius (km)"
            placeholder="e.g. 25"
            value={deliveryRadiusKm}
            onChangeText={setDeliveryRadiusKm}
            keyboardType="number-pad"
          />
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          className={`items-center rounded-xl py-4 ${
            saving ? "bg-orange-300" : "bg-[#FF641F]"
          }`}
        >
          {saving ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#FFFFFF" />

              <Text className="ml-2 font-bold text-white">Submitting...</Text>
            </View>
          ) : (
            <Text className="font-bold text-white">
              Submit for Verification
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ title, active = false }: { title: string; active?: boolean }) {
  return (
    <View
      className={`flex-1 items-center rounded-full py-2 ${
        active ? "bg-[#071226]" : "border border-gray-200 bg-white"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          active ? "text-white" : "text-gray-500"
        }`}
      >
        {title}
      </Text>
    </View>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "sentences",
  maxLength,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?:
    | "default"
    | "number-pad"
    | "decimal-pad"
    | "email-address"
    | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-semibold text-[#111827]">{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        className="rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3.5 text-sm text-[#111827]"
      />
    </View>
  );
}
