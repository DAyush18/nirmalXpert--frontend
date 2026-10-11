import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import { api } from "@/api/client";
import { RejectionNotice } from "@/components/dealer/RejectionNotice";
import { useCompleteStep } from "@/lib/useCompleteStep";

// ============================================================================
// TYPES
// ============================================================================

type BusinessType =
  | "SOLE_PROPRIETORSHIP"
  | "PARTNERSHIP"
  | "PRIVATE_LIMITED"
  | "PUBLIC_LIMITED"
  | "LLP"
  | "OTHER";

type DocumentType =
  | "PAN"
  | "GST"
  | "BUSINESS_PROOF"
  | "SHOP_LICENSE"
  | "INCORPORATION_CERT"
  | "ADDRESS_PROOF"
  | "MSME";

type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED" | "MISSING";

type DealerDocument = {
  type: DocumentType;
  required: boolean;
  status: DocumentStatus;
  rejectionReason: string | null;
  fileName: string | null;
  url: string | null;
  uploadedAt: string | null;
};

type DealerResponse = {
  profile: {
    businessType: BusinessType | null;
    gstRegistered: boolean;
    gstNumber: string | null;
    panNumber: string | null;
    cinNumber: string | null;
    authorizedPersonName: string | null;
  };
  documents: DealerDocument[];
};

type PickedFile = DocumentPicker.DocumentPickerAsset;

type UploadState = "idle" | "queued" | "uploading";

// ============================================================================
// CONSTANTS
// ============================================================================

const NAVY = "#071b55";
const INK = "#020b29";
const BORDER = "#d4d7de";

const BUSINESS_TYPES: { label: string; value: BusinessType }[] = [
  { label: "Sole Proprietorship", value: "SOLE_PROPRIETORSHIP" },
  { label: "Partnership", value: "PARTNERSHIP" },
  { label: "Private Limited Company", value: "PRIVATE_LIMITED" },
  { label: "Public Limited Company", value: "PUBLIC_LIMITED" },
  { label: "LLP", value: "LLP" },
  { label: "Other", value: "OTHER" },
];

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const DOCUMENT_INFO: Record<
  DocumentType,
  { title: string; description: string; icon: IconName }
> = {
  GST: {
    title: "GST Certificate",
    description: "PDF or JPG (Max 5MB)",
    icon: "file-document-outline",
  },
  PAN: {
    title: "Business PAN Card",
    description: "Scanned copy (Front)",
    icon: "card-account-details-outline",
  },
  SHOP_LICENSE: {
    title: "Shop & Establishment License",
    description: "For proprietorships",
    icon: "storefront-outline",
  },
  INCORPORATION_CERT: {
    title: "Incorporation Certificate",
    description: "For Companies/LLPs",
    icon: "certificate-outline",
  },
  ADDRESS_PROOF: {
    title: "Address Proof",
    description: "Utility Bill / Rent Agreement",
    icon: "map-marker-outline",
  },
  MSME: {
    title: "MSME Registration",
    description: "Udyam Certificate",
    icon: "briefcase-check-outline",
  },
  BUSINESS_PROOF: {
    title: "Business Proof",
    description: "Valid business proof",
    icon: "file-document-outline",
  },
};

// Order in which cards appear on screen (matches the design)
const DOCUMENT_ORDER: DocumentType[] = [
  "GST",
  "PAN",
  "SHOP_LICENSE",
  "INCORPORATION_CERT",
  "ADDRESS_PROOF",
  "MSME",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 60_000;
const UPLOAD_ATTEMPTS = 3;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// SCREEN
// ============================================================================

export default function BusinessVerification() {
  const completeStep = useCompleteStep("verification");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [gstRegistered, setGstRegistered] = useState(false);

  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [cinNumber, setCinNumber] = useState("");
  const [authorizedPersonName, setAuthorizedPersonName] = useState("");

  const [showBusinessTypes, setShowBusinessTypes] = useState(false);

  const [documents, setDocuments] = useState<
    Partial<Record<DocumentType, DealerDocument>>
  >({});

  const [uploadState, setUploadState] = useState<
    Partial<Record<DocumentType, UploadState>>
  >({});

  // Every upload is chained onto this promise, so the server only ever
  // receives ONE upload request at a time.
  const uploadQueue = useRef<Promise<void>>(Promise.resolve());
  // Stops the same card from being queued twice.
  const inFlight = useRef<Set<DocumentType>>(new Set());
  // Prevents the document picker being opened twice at once.
  const pickerOpen = useRef(false);

  useEffect(() => {
    loadProfile();
  }, []);

  // ---------------------------------------------------------------------------
  // GET /dealer/me
  // ---------------------------------------------------------------------------

  async function loadProfile() {
    try {
      setLoading(true);

      const response = await api.get<DealerResponse>("/dealer/me");
      const { profile, documents } = response.data;

      setBusinessType(profile.businessType);
      setGstRegistered(profile.gstRegistered);

      setGstNumber(profile.gstNumber ?? "");
      setPanNumber(profile.panNumber ?? "");
      setCinNumber(profile.cinNumber ?? "");
      setAuthorizedPersonName(profile.authorizedPersonName ?? "");

      const map: Partial<Record<DocumentType, DealerDocument>> = {};
      documents.forEach((document) => {
        map[document.type] = document;
      });

      setDocuments(map);
    } catch (error: any) {
      console.error("Failed to load dealer:", error);

      Alert.alert(
        "Error",
        error?.response?.data?.message ??
          "Unable to load verification details.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Required documents
  // ---------------------------------------------------------------------------

  const requiredDocuments = useMemo(() => {
    const result: DocumentType[] = ["PAN", "ADDRESS_PROOF"];

    if (gstRegistered) result.push("GST");

    if (
      businessType === "SOLE_PROPRIETORSHIP" ||
      businessType === "PARTNERSHIP"
    ) {
      result.push("SHOP_LICENSE");
    }

    if (
      businessType === "PRIVATE_LIMITED" ||
      businessType === "PUBLIC_LIMITED" ||
      businessType === "LLP"
    ) {
      result.push("INCORPORATION_CERT");
    }

    return result;
  }, [businessType, gstRegistered]);

  const isUploading = Object.values(uploadState).some(
    (state) => state === "uploading" || state === "queued",
  );

  // ---------------------------------------------------------------------------
  // Save verification details
  // ---------------------------------------------------------------------------

  async function saveVerification() {
    const payload: {
      businessType?: BusinessType;
      panNumber?: string;
      gstNumber?: string;
      cinNumber?: string;
      authorizedPersonName?: string;
    } = {};

    if (businessType) payload.businessType = businessType;
    if (panNumber.trim()) payload.panNumber = panNumber.trim().toUpperCase();

    if (gstRegistered && gstNumber.trim()) {
      payload.gstNumber = gstNumber.trim().toUpperCase();
    }

    if (cinNumber.trim()) payload.cinNumber = cinNumber.trim().toUpperCase();

    if (authorizedPersonName.trim()) {
      payload.authorizedPersonName = authorizedPersonName.trim();
    }

    await api.patch("/dealer/profile/verification", payload);
  }

  async function handleSaveDraft() {
    if (saving) return;

    try {
      setSaving(true);
      await saveVerification();
      Alert.alert("Saved", "Your verification details are saved.");
    } catch (error: any) {
      Alert.alert(
        "Unable to save",
        error?.response?.data?.message ??
          "Failed to save verification details.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Upload document
  // ---------------------------------------------------------------------------

  function setState(type: DocumentType, state: UploadState) {
    setUploadState((previous) => ({ ...previous, [type]: state }));
  }

  /** One upload request. FormData is rebuilt for every attempt. */
  async function postDocument(type: DocumentType, file: PickedFile) {
    const formData = new FormData();

    formData.append("file", {
      uri: file.uri,
      name: file.name ?? `${type.toLowerCase()}-document`,
      type: file.mimeType ?? "application/pdf",
    } as any);

    return api.post<DealerResponse>(`/dealer/documents/${type}`, formData, {
      // Without an explicit multipart header, a JSON default on the axios
      // instance makes React Native send a broken body ("Network Error").
      headers: { "Content-Type": "multipart/form-data" },
      timeout: UPLOAD_TIMEOUT_MS,
      transformRequest: (data) => data,
    });
  }

  async function uploadWithRetry(type: DocumentType, file: PickedFile) {
    let lastError: any;

    for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt++) {
      try {
        return await postDocument(type, file);
      } catch (error: any) {
        lastError = error;

        // Retry only when the request never got an HTTP answer
        // (dropped connection / Network Error / timeout).
        if (error?.response) throw error;

        if (attempt < UPLOAD_ATTEMPTS) await wait(800 * attempt);
      }
    }

    throw lastError;
  }

  async function runUpload(type: DocumentType, file: PickedFile) {
    setState(type, "uploading");

    try {
      const response = await uploadWithRetry(type, file);

      // Merge ONLY this document. Replacing the whole map could wipe out
      // other documents that finished while this request was running.
      const updated = response.data.documents.find(
        (document) => document.type === type,
      );

      if (updated) {
        setDocuments((previous) => ({ ...previous, [type]: updated }));
      }
    } catch (error: any) {
      console.error(
        `Upload ${type} failed:`,
        error?.message,
        error?.response?.data,
      );

      Alert.alert(
        "Upload failed",
        error?.response?.data?.message ??
          "Could not upload the document. Check your connection and try again.",
      );
    } finally {
      inFlight.current.delete(type);
      setState(type, "idle");
    }
  }

  async function handleUpload(type: DocumentType) {
    if (inFlight.current.has(type) || pickerOpen.current) return;

    let file: PickedFile;

    try {
      pickerOpen.current = true;

      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      file = result.assets[0];
    } catch (error) {
      console.error("Document picker failed:", error);
      return;
    } finally {
      pickerOpen.current = false;
    }

    if (file.size && file.size > MAX_FILE_SIZE) {
      Alert.alert("File too large", "Maximum file size is 5MB.");
      return;
    }

    // Add to the queue. The user can pick the next document straight away;
    // requests are sent one after another.
    inFlight.current.add(type);
    setState(type, isUploading ? "queued" : "uploading");

    uploadQueue.current = uploadQueue.current.then(() => runUpload(type, file));
  }

  // ---------------------------------------------------------------------------
  // Continue
  // ---------------------------------------------------------------------------

  async function handleContinue() {
    if (isUploading) {
      Alert.alert("Please wait", "Documents are still uploading.");
      return;
    }

    if (!businessType) {
      Alert.alert("Business Type", "Please select your business type.");
      return;
    }

    if (!panNumber.trim()) {
      Alert.alert("PAN Number", "Please enter PAN number.");
      return;
    }

    if (gstRegistered && !gstNumber.trim()) {
      Alert.alert("GST Number", "Please enter GST number.");
      return;
    }

    if (!authorizedPersonName.trim()) {
      Alert.alert("Authorized Person", "Please enter authorized person name.");
      return;
    }

    const missingDocuments = requiredDocuments.filter((type) => {
      const document = documents[type];

      return (
        !document ||
        document.status === "MISSING" ||
        document.status === "REJECTED"
      );
    });

    if (missingDocuments.length > 0) {
      Alert.alert(
        "Documents Required",
        "Please upload all required documents before continuing.",
      );
      return;
    }

    try {
      setSaving(true);
      await saveVerification();

      // The dealer layout moves the dealer to the next legal step.
      await completeStep();
    } catch (error: any) {
      console.error("Save verification failed:", error);

      Alert.alert(
        "Unable to continue",
        error?.response?.data?.message ??
          "Failed to save verification details.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={NAVY} />
        <Text className="mt-3 text-sm text-gray-500">Loading...</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  const selectedBusinessLabel = BUSINESS_TYPES.find(
    (item) => item.value === businessType,
  )?.label;

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* HEADER */}
        <View className="px-4 pt-5">
          <Text className="text-[22px] font-bold text-black">
            Business Verification
          </Text>
          <Text className="mt-1 text-[13px] text-gray-600">
            Step 2: Official Registration & Documentation
          </Text>
        </View>

        <RejectionNotice step="verification" className="mx-4 mt-4" />

        {/* OFFICIAL DETAILS */}
        <View className="mt-6 px-4">
          <SectionTitle
            icon={
              <MaterialCommunityIcons
                name="office-building-outline"
                size={20}
                color="#000"
              />
            }
            title="OFFICIAL DETAILS"
          />

          <Label text="Business Type" required />

          <Pressable
            onPress={() => setShowBusinessTypes((open) => !open)}
            style={{ borderColor: BORDER }}
            className="h-[50px] flex-row items-center justify-between rounded-xl border bg-white px-4"
          >
            <Text
              className={`text-[15px] ${
                businessType ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {selectedBusinessLabel ?? "Select Business Type"}
            </Text>

            <Ionicons
              name={showBusinessTypes ? "chevron-up" : "chevron-down"}
              size={18}
              color="#374151"
            />
          </Pressable>

          {showBusinessTypes && (
            <View
              style={{ borderColor: BORDER }}
              className="mt-1 overflow-hidden rounded-xl border bg-white"
            >
              {BUSINESS_TYPES.map((item, index) => (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    setBusinessType(item.value);
                    setShowBusinessTypes(false);
                  }}
                  className={`flex-row items-center justify-between px-4 py-3.5 ${
                    index < BUSINESS_TYPES.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <Text className="text-[14px] text-gray-800">
                    {item.label}
                  </Text>

                  {businessType === item.value && (
                    <Ionicons name="checkmark" size={18} color={NAVY} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {gstRegistered && (
            <Field
              label="GST Number"
              required
              value={gstNumber}
              onChangeText={setGstNumber}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
            />
          )}

          <Field
            label="PAN Number"
            required
            value={panNumber}
            onChangeText={setPanNumber}
            placeholder="ABCDE1234F"
            maxLength={10}
          />

          <Field
            label="CIN Number (Optional)"
            value={cinNumber}
            onChangeText={setCinNumber}
            placeholder="U12345MH2023PTC123456"
            maxLength={21}
          />

          <Field
            label="Authorized Person Name"
            required
            value={authorizedPersonName}
            onChangeText={setAuthorizedPersonName}
            placeholder="As per PAN Card"
            autoCapitalize="words"
          />
        </View>

        {/* DOCUMENT UPLOAD */}
        <View className="mt-7 px-4">
          <SectionTitle
            icon={<Ionicons name="cloud-upload" size={22} color="#000" />}
            title="DOCUMENT UPLOAD"
          />

          {DOCUMENT_ORDER.map((type) => (
            <DocumentCard
              key={type}
              type={type}
              document={documents[type]}
              required={requiredDocuments.includes(type)}
              state={uploadState[type] ?? "idle"}
              onUpload={() => handleUpload(type)}
            />
          ))}
        </View>

        {/* SECURITY */}
        <View
          style={{ borderColor: BORDER }}
          className="mx-4 mt-5 h-[46px] flex-row items-center justify-center rounded-full border bg-[#f1f3f6]"
        >
          <Ionicons name="shield-checkmark" size={16} color="#1f2937" />
          <Text className="ml-2 text-[12px] font-bold tracking-widest text-gray-900">
            SECURE AES-256 ENCRYPTION
          </Text>
        </View>

        {/* WHY VERIFY */}
        <View
          style={{ borderColor: NAVY }}
          className="mx-4 mt-4 rounded-2xl border bg-[#e6e8ee] px-4 py-4"
        >
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#4b5563"
            />

            <View className="ml-2 flex-1">
              <Text className="text-[14px] font-bold text-gray-800">
                Why verify?
              </Text>

              <Text className="mt-1 text-[13px] leading-[20px] text-gray-600">
                Verification establishes trust with material suppliers and helps
                in unlocking credit limits up to ₹50 Lakhs for your construction
                projects.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FIXED BOTTOM ACTIONS */}
      <View className="flex-row gap-3 border-t border-gray-200 bg-white px-4 pb-5 pt-3">
        <Pressable
          disabled={saving}
          onPress={handleSaveDraft}
          style={{ borderColor: BORDER }}
          className="h-[50px] flex-1 items-center justify-center rounded-xl border bg-white"
        >
          <Text className="text-[14px] font-bold" style={{ color: NAVY }}>
            Save Draft
          </Text>
        </Pressable>

        <Pressable
          disabled={saving || isUploading}
          onPress={handleContinue}
          className={`h-[50px] flex-1 items-center justify-center rounded-xl ${
            saving || isUploading ? "bg-orange-300" : "bg-orange-500"
          }`}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-[14px] font-bold text-white">Continue →</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ============================================================================
// SMALL PIECES
// ============================================================================

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View className="mb-4 flex-row items-center">
      {icon}
      <Text className="ml-2 text-[14px] font-semibold tracking-wider text-black">
        {title}
      </Text>
    </View>
  );
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text className="mb-1.5 text-[12px] font-semibold text-gray-800">
      {text}
      {required && <Text className="text-red-600"> *</Text>}
    </Text>
  );
}

function Field({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = "characters",
  maxLength,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
}) {
  return (
    <View className="mt-4">
      <Label text={label} required={required} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8a90a0"
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        maxLength={maxLength}
        style={{ borderColor: BORDER }}
        className="h-[50px] rounded-xl border bg-white px-4 text-[15px] text-gray-900"
      />
    </View>
  );
}

function DocumentCard({
  type,
  document,
  required,
  state,
  onUpload,
}: {
  type: DocumentType;
  document?: DealerDocument;
  required: boolean;
  state: UploadState;
  onUpload: () => void;
}) {
  const info = DOCUMENT_INFO[type];

  const uploaded = !!document && document.status !== "MISSING";
  const busy = state !== "idle";

  return (
    <View
      style={{ borderColor: BORDER }}
      className="mb-3 min-h-[84px] flex-row items-center rounded-2xl border bg-white px-4 py-3"
    >
      {/* ICON */}
      <View className="h-[48px] w-[48px] items-center justify-center rounded-lg bg-[#eef0f3]">
        <MaterialCommunityIcons name={info.icon} size={24} color="#111827" />
      </View>

      {/* INFO */}
      <View className="ml-3 flex-1 pr-2">
        <Text
          numberOfLines={2}
          className="text-[14px] font-semibold leading-[18px] text-gray-900"
        >
          {info.title}
          {required && <Text className="text-red-600"> *</Text>}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-0.5 text-[12px] leading-[16px] text-gray-600"
        >
          {uploaded
            ? (document?.fileName ?? "Document uploaded")
            : info.description}
        </Text>

        {state === "uploading" && (
          <Text className="mt-0.5 text-[11px] font-semibold text-gray-500">
            Uploading…
          </Text>
        )}

        {state === "queued" && (
          <Text className="mt-0.5 text-[11px] font-semibold text-gray-500">
            Waiting to upload…
          </Text>
        )}

        {state === "idle" && document?.status === "PENDING" && (
          <Text className="mt-0.5 text-[11px] font-semibold text-orange-500">
            Under review
          </Text>
        )}

        {state === "idle" && document?.status === "APPROVED" && (
          <Text className="mt-0.5 text-[11px] font-semibold text-green-600">
            Approved
          </Text>
        )}

        {state === "idle" && document?.status === "REJECTED" && (
          <Text className="mt-0.5 text-[11px] font-semibold text-red-500">
            Rejected — upload again
          </Text>
        )}
      </View>

      {/* BUTTON */}
      <Pressable
        onPress={onUpload}
        disabled={busy}
        style={{ backgroundColor: busy ? "#9ca3af" : INK }}
        className="h-[34px] min-w-[84px] items-center justify-center rounded-full px-4"
      >
        {busy ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text className="text-[12px] font-bold tracking-wide text-white">
            {uploaded ? "REPLACE" : "UPLOAD"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
