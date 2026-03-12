import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated: March 2026</Text>

        <Text style={[styles.heading, { color: colors.text }]}>1. Information We Collect</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          KickSight collects the following information when you create an account:{"\n"}
          • Email address{"\n"}
          • Display name{"\n"}
          • Authentication tokens (stored securely on your device){"\n\n"}
          We do NOT collect location data, contacts, photos, or any other personal data beyond what is needed for authentication.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>2. How We Use Your Information</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Your information is used exclusively to:{"\n"}
          • Authenticate your identity{"\n"}
          • Save your match predictions{"\n"}
          • Personalize your app experience (language, theme){"\n\n"}
          We do NOT sell, share, or trade your personal information with third parties.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>3. Data Storage & Security</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          • Passwords are hashed using bcrypt with a cost factor of 12{"\n"}
          • Authentication tokens are stored in iOS Keychain / Android Keystore{"\n"}
          • Server communications use HTTPS encryption{"\n"}
          • Database connections use SSL/TLS encryption
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>4. Third-Party Services</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          KickSight integrates with:{"\n"}
          • Google Sign-In (for authentication only){"\n"}
          • ESPN API (public match data){"\n\n"}
          Each service is governed by its own privacy policy.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>5. Data Deletion</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You can delete your account and all associated data at any time from the Profile screen. Upon deletion, all your data is permanently removed from our servers.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>6. Children's Privacy</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          KickSight is not intended for use by anyone under the age of 18. We do not knowingly collect data from minors.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>7. Disclaimer</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          KickSight provides probability-based match analysis for entertainment and informational purposes only. Predictions are statistical estimates, not guarantees. Users are responsible for their own decisions. Please bet responsibly.
        </Text>

        <Text style={[styles.heading, { color: colors.text }]}>8. Contact</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          For privacy concerns or data requests, contact us at: support@kicksight.app
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "web" ? 20 : 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },
  content: { padding: 20 },
  updated: { fontSize: 13, marginBottom: 20 },
  heading: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", marginTop: 24, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 22 },
});
