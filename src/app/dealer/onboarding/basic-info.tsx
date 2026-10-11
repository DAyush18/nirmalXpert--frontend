import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import { authApi } from "@/api/auth.api";
import { dealerApi } from "@/api/dealer.api";
import { resolveMediaUrl } from "@/lib/media";
import { RejectionNotice } from "@/components/dealer/RejectionNotice";
import { useCompleteStep } from "@/lib/useCompleteStep";
import { useAuthStore } from "@/store/auth.store";

type Category = {
  id: string;
  name: string;
  selected?: boolean;
};

const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

type EmployeeRange = (typeof EMPLOYEE_RANGES)[number];

export default function BasicInfoScreen() {
  const completeStep = useCompleteStep("basic");

  const user = useAuthStore((state) => state.user);

  // -----------------------------
  // Basic information
  // -----------------------------

  const [ownerName, setOwnerName] = useState(user?.name ?? "");
  const [legalName, setLegalName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [employeeRange, setEmployeeRange] = useState<EmployeeRange | "">("");
  const [gstRegistered, setGstRegistered] = useState(false);

  // -----------------------------
  // Categories
  // -----------------------------

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // -----------------------------
  // Images
  // -----------------------------

  const [logo, setLogo] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);

  // -----------------------------
  // UI state
  // -----------------------------

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEmployeeRanges, setShowEmployeeRanges] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // ---------------------------------
  // Load existing dealer information
  // ---------------------------------

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [dealer, categoryData] = await Promise.all([
        dealerApi.getMe(),
        dealerApi.getCategories(),
      ]);

      console.log("DEALER ME:", dealer);
      console.log("CATEGORIES:", categoryData);

      /*
       * We don't know your exact GET /dealer/me response shape yet,
       * so these are defensive mappings.
       */

      if (dealer?.basic) {
        setLegalName(dealer.basic.legalName ?? "");
        setBusinessName(dealer.basic.businessName ?? "");
        setYearsInBusiness(
          dealer.basic.yearsInBusiness != null
            ? String(dealer.basic.yearsInBusiness)
            : "",
        );
        setEmployeeRange(dealer.basic.employeeRange ?? "");
        setGstRegistered(Boolean(dealer.basic.gstRegistered));
      }

      if (dealer?.legalName) {
        setLegalName(dealer.legalName);
      }

      if (dealer?.businessName) {
        setBusinessName(dealer.businessName);
      }

      if (dealer?.yearsInBusiness != null) {
        setYearsInBusiness(String(dealer.yearsInBusiness));
      }

      if (dealer?.employeeRange) {
        setEmployeeRange(dealer.employeeRange);
      }

      if (dealer?.gstRegistered != null) {
        setGstRegistered(Boolean(dealer.gstRegistered));
      }

      if (dealer?.logoUrl) {
        setLogo(dealer.logoUrl);
      }

      if (dealer?.coverUrl) {
        setCover(dealer.coverUrl);
      }

      // Real response shape: everything lives under `profile`.
      const profile = dealer?.profile;

      if (profile) {
        setLegalName(profile.legalName ?? "");
        setBusinessName(profile.businessName ?? "");
        setYearsInBusiness(
          profile.yearsInBusiness != null ? String(profile.yearsInBusiness) : "",
        );
        setEmployeeRange(profile.employeeRange ?? "");
        setGstRegistered(Boolean(profile.gstRegistered));

        if (profile.logoUrl) setLogo(resolveMediaUrl(profile.logoUrl));
        if (profile.coverImageUrl) setCover(resolveMediaUrl(profile.coverImageUrl));
      }

      setCategories(categoryData);

      const selected = categoryData
        .filter((category: Category) => category.selected)
        .map((category: Category) => category.id);

      setSelectedCategoryIds(selected);
    } catch (error) {
      console.error("Failed to load dealer basic info:", error);

      if (axios.isAxiosError(error)) {
        console.log("STATUS:", error.response?.status);
        console.log("RESPONSE:", error.response?.data);
      }

      Alert.alert(
        "Unable to load",
        "Could not load your business information.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------
  // Image picker
  // ---------------------------------

  const pickImage = async (type: "logo" | "cover") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const uri = result.assets[0].uri;

    if (type === "logo") {
      setLogo(uri);
    } else {
      setCover(uri);
    }
  };

  // ---------------------------------
  // Category selection
  // ---------------------------------

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((current) => {
      if (current.includes(id)) {
        return current.filter((categoryId) => categoryId !== id);
      }

      return [...current, id];
    });
  };

  // ---------------------------------
  // Validation
  // ---------------------------------

  const validate = () => {
    if (ownerName.trim().length < 2) {
      Alert.alert("Required", "Please enter your name.");
      return false;
    }

    if (!legalName.trim()) {
      Alert.alert(
        "Required",
        "Please enter your official registered business name.",
      );
      return false;
    }

    if (legalName.trim().length < 2) {
      Alert.alert(
        "Invalid name",
        "Registered business name must contain at least 2 characters.",
      );
      return false;
    }

    if (!businessName.trim()) {
      Alert.alert("Required", "Please enter your business display name.");
      return false;
    }

    const years = Number(yearsInBusiness);

    if (
      !yearsInBusiness.trim() ||
      !Number.isInteger(years) ||
      years < 0 ||
      years > 100
    ) {
      Alert.alert(
        "Invalid value",
        "Years in business must be a whole number between 0 and 100.",
      );
      return false;
    }

    if (!employeeRange) {
      Alert.alert("Required", "Please select your employee range.");
      return false;
    }

    if (selectedCategoryIds.length === 0) {
      Alert.alert("Required", "Please select at least one business category.");
      return false;
    }

    if (!cover) {
      Alert.alert("Required", "Please upload your company cover image.");
      return false;
    }

    if (!logo) {
      Alert.alert("Required", "Please upload your business logo.");
      return false;
    }

    return true;
  };

  // ---------------------------------
  // Save
  // ---------------------------------

  const handleContinue = async () => {
    if (!validate()) {
      return;
    }

    try {
      setSaving(true);

      // ---------------------------------
      // 0. Save the owner name (phone sign-up has no name yet)
      // ---------------------------------

      if (ownerName.trim() !== (user?.name ?? "")) {
        const profile = await authApi.updateProfile({ name: ownerName.trim() });

        useAuthStore.getState().updateUser({ name: profile.name ?? ownerName.trim() });
      }

      // ---------------------------------
      // 1. Save basic information
      // ---------------------------------

      const basicPayload = {
        legalName: legalName.trim(),
        businessName: businessName.trim(),
        yearsInBusiness: Number(yearsInBusiness),
        employeeRange: employeeRange as EmployeeRange,
        gstRegistered,
      };

      console.log("BASIC PAYLOAD:", basicPayload);

      await dealerApi.updateBasic(basicPayload);

      console.log("Basic information saved");

      // ---------------------------------
      // 2. Save categories
      // ---------------------------------

      await dealerApi.updateCategories(selectedCategoryIds);

      console.log("Categories saved");

      // ---------------------------------
      // 3. Upload images
      // ---------------------------------

      // Images already stored on the server are remote URLs. Only upload images
      // picked just now (local file URIs); re-uploading a remote URL fails, which
      // would break editing this step after a rejection.
      const isNewImage = (uri: string | null): uri is string =>
        !!uri && /^(file|content|ph|assets-library):/i.test(uri);

      if (isNewImage(logo) || isNewImage(cover)) {
        await dealerApi.uploadImages(
          isNewImage(logo)
            ? { uri: logo, name: "dealer-logo.jpg", type: "image/jpeg" }
            : undefined,
          isNewImage(cover)
            ? { uri: cover, name: "dealer-cover.jpg", type: "image/jpeg" }
            : undefined,
        );

        console.log("Business images uploaded");
      }

      // ---------------------------------
      // 4. Go to verification
      // ---------------------------------

      // The dealer layout moves the dealer to the next legal step.
      await completeStep();
    } catch (error) {
      console.error("Dealer basic info error:", error);

      if (axios.isAxiosError(error)) {
        console.log("Basic info status:", error.response?.status);

        console.log("Basic info response:", error.response?.data);

        const message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to save dealer information.";

        Alert.alert("Unable to save", message);
      } else {
        Alert.alert(
          "Unable to save",
          "Something went wrong. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------
  // Loading
  // ---------------------------------

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F7F8FA]">
        <ActivityIndicator size="large" />

        <Text className="mt-3 text-sm text-gray-500">
          Loading business details...
        </Text>
      </SafeAreaView>
    );
  }

  // ---------------------------------
  // UI
  // ---------------------------------

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
            <View>
              <Text className="text-[18px] font-bold text-[#071226]">
                Business Details
              </Text>

              <Text className="text-xs text-gray-500">
                Step 1 of 3 • Help us verify your professional identity.
              </Text>
            </View>
          </View>
        </View>

        {/* Progress */}

        <View className="mb-5 flex-row gap-2">
          <Progress active />
          <Progress />
          <Progress />
        </View>

        <RejectionNotice step="basic" />

        {/* Business Media */}

        <SectionTitle title="Business Media" />

        {/* Cover */}

        <Pressable
          onPress={() => pickImage("cover")}
          className="mb-4 overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-[#F1F4F7]"
        >
          {cover ? (
            <View>
              <Image
                source={{ uri: cover }}
                className="h-48 w-full"
                resizeMode="cover"
              />

              <View className="absolute right-3 top-3 rounded-full bg-white px-3 py-2">
                <Text className="text-xs font-bold text-[#071226]">Change</Text>
              </View>
            </View>
          ) : (
            <View className="h-32 items-center justify-center">
              <Text className="mb-2 text-3xl text-gray-500">⊕</Text>

              <Text className="text-sm font-semibold text-gray-700">
                Upload Company Cover *
              </Text>

              <Text className="mt-1 text-xs text-gray-500">
                1600×900px recommended • Max 5MB
              </Text>
            </View>
          )}
        </Pressable>

        {/* Logo */}

        <View className="mb-6 flex-row items-center rounded-2xl border border-gray-200 bg-white p-4">
          <Pressable
            onPress={() => pickImage("logo")}
            className="h-20 w-20 overflow-hidden rounded-xl bg-gray-100"
          >
            {logo ? (
              <Image
                source={{ uri: logo }}
                className="h-full w-full"
                resizeMode="contain"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-2xl text-gray-500">▣</Text>
              </View>
            )}
          </Pressable>

          <View className="ml-4 flex-1">
            <Text className="text-sm font-bold text-[#111827]">
              Business Logo *
            </Text>

            <Text className="mt-1 text-xs text-gray-500">
              Square ratio works best
            </Text>
          </View>

          <Pressable
            onPress={() => pickImage("logo")}
            className="rounded-full bg-[#071226] px-5 py-3"
          >
            <Text className="text-sm font-semibold text-white">
              {logo ? "Change" : "Upload"}
            </Text>
          </Pressable>
        </View>

        {/* Basic Information */}

        <SectionTitle title="Basic Information" />

        {/* Dealer Name */}

        <View className="mb-4">
          <Text className="mb-2 text-sm font-semibold text-[#111827]">
            Dealer/Supplier Name <Text className="text-red-500">*</Text>
          </Text>

          <TextInput
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="Enter your name"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            className="rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3.5 text-sm text-[#111827]"
          />

          <Text className="mt-1 text-xs text-gray-400">
            Taken from your account registration.
          </Text>
        </View>

        {/* Legal Name */}

        <Input
          label="Official Registered Business Name *"
          placeholder="Legal name as per GST/PAN"
          value={legalName}
          onChangeText={setLegalName}
        />

        {/* Display Name */}

        <Input
          label="Business Display Name *"
          placeholder="How customers see your shop"
          value={businessName}
          onChangeText={setBusinessName}
        />

        {/* Category */}

        <View className="mb-4">
          <Text className="mb-2 text-sm font-semibold text-[#111827]">
            Business Category <Text className="text-red-500">*</Text>
          </Text>

          <Pressable
            onPress={() => setShowCategories((value) => !value)}
            className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-4"
          >
            <Text
              className={
                selectedCategoryIds.length
                  ? "text-sm text-[#111827]"
                  : "text-sm text-gray-400"
              }
            >
              {selectedCategoryIds.length
                ? `${selectedCategoryIds.length} selected`
                : "Select Category"}
            </Text>

            <Text className="text-gray-500">{showCategories ? "▲" : "▼"}</Text>
          </Pressable>

          {showCategories && (
            <View className="mt-2 rounded-xl border border-gray-200 bg-white p-2">
              {categories.map((category) => {
                const selected = selectedCategoryIds.includes(category.id);

                return (
                  <Pressable
                    key={category.id}
                    onPress={() => toggleCategory(category.id)}
                    className={`mb-1 rounded-lg px-3 py-3 ${
                      selected ? "bg-[#071226]" : "bg-white"
                    }`}
                  >
                    <Text
                      className={
                        selected
                          ? "text-sm font-semibold text-white"
                          : "text-sm text-gray-700"
                      }
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Years */}

        <Input
          label="Years In Business *"
          placeholder="e.g. 5"
          value={yearsInBusiness}
          onChangeText={setYearsInBusiness}
          keyboardType="number-pad"
        />

        {/* Employees */}

        <View className="mb-5">
          <Text className="mb-2 text-sm font-semibold text-[#111827]">
            Number of Employees <Text className="text-red-500">*</Text>
          </Text>

          <Pressable
            onPress={() => setShowEmployeeRanges((value) => !value)}
            className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-4"
          >
            <Text
              className={
                employeeRange
                  ? "text-sm text-[#111827]"
                  : "text-sm text-gray-400"
              }
            >
              {employeeRange || "Select Range"}
            </Text>

            <Text className="text-gray-500">
              {showEmployeeRanges ? "▲" : "▼"}
            </Text>
          </Pressable>

          {showEmployeeRanges && (
            <View className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {EMPLOYEE_RANGES.map((range) => (
                <Pressable
                  key={range}
                  onPress={() => {
                    setEmployeeRange(range);
                    setShowEmployeeRanges(false);
                  }}
                  className={`border-b border-gray-100 px-4 py-3 ${
                    employeeRange === range ? "bg-gray-100" : "bg-white"
                  }`}
                >
                  <Text className="text-sm text-[#111827]">
                    {range} employees
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* GST */}

        <View className="mb-5 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4 py-4">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-lg bg-gray-100">
            <Text className="text-xl">▣</Text>
          </View>

          <View className="flex-1">
            <Text className="font-semibold text-[#111827]">GST Registered</Text>

            <Text className="mt-1 text-xs text-gray-500">
              Provide GSTIN for input credit
            </Text>
          </View>

          <Switch
            value={gstRegistered}
            onValueChange={setGstRegistered}
            trackColor={{
              false: "#D1D5DB",
              true: "#FF641F",
            }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Live Preview */}

        <View className="mb-5 overflow-hidden rounded-2xl bg-[#071226] p-5">
          <Text className="text-xs font-medium text-gray-400">
            LIVE PREVIEW
          </Text>

          <Text className="mt-1 text-xl font-bold text-white">
            {businessName || "Your Store Name"}
          </Text>

          <View className="mt-5 flex-row justify-between">
            <Text className="text-xs text-white">Profile Completion</Text>

            <Text className="text-xs text-white">
              {calculateCompletion({
                legalName,
                businessName,
                yearsInBusiness,
                employeeRange,
                selectedCategoryIds,
                logo,
                cover,
              })}
              %
            </Text>
          </View>

          <View className="mt-2 h-2 overflow-hidden rounded-full bg-gray-700">
            <View
              className="h-full rounded-full bg-[#FF641F]"
              style={{
                width: `${calculateCompletion({
                  legalName,
                  businessName,
                  yearsInBusiness,
                  employeeRange,
                  selectedCategoryIds,
                  logo,
                  cover,
                })}%`,
              }}
            />
          </View>
        </View>

        {/* Continue */}

        <Pressable
          onPress={handleContinue}
          disabled={saving}
          className={`items-center rounded-xl py-4 ${
            saving ? "bg-orange-300" : "bg-[#FF641F]"
          }`}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="font-bold text-white">Save & Continue →</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// Components
// =====================================================

function SectionTitle({ title }: { title: string }) {
  return (
    <Text className="mb-3 text-[17px] font-bold text-[#111827]">{title}</Text>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad" | "email-address" | "phone-pad";
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
        className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-[#111827]"
      />
    </View>
  );
}

function Progress({ active = false }: { active?: boolean }) {
  return (
    <View
      className={`h-1.5 flex-1 rounded-full ${
        active ? "bg-[#FF641F]" : "bg-gray-200"
      }`}
    />
  );
}

function calculateCompletion({
  legalName,
  businessName,
  yearsInBusiness,
  employeeRange,
  selectedCategoryIds,
  logo,
  cover,
}: {
  legalName: string;
  businessName: string;
  yearsInBusiness: string;
  employeeRange: string;
  selectedCategoryIds: string[];
  logo: string | null;
  cover: string | null;
}) {
  let completed = 0;

  if (legalName.trim()) completed++;
  if (businessName.trim()) completed++;
  if (yearsInBusiness.trim()) completed++;
  if (employeeRange) completed++;
  if (selectedCategoryIds.length > 0) completed++;
  if (logo) completed++;
  if (cover) completed++;

  return Math.round((completed / 7) * 100);
}
