import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useI18n, LANGUAGES } from "@/lib/i18n";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/query-client";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const { user, logout } = useAuth();
  const { colors, isDark, toggle } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version ?? "2.1.0";
  const [showLangModal, setShowLangModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    try {
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem("kicksight_plan") : null;
      if (saved === "pro") setIsPro(true);
    } catch {}
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/(auth)/login");
  };

  const handleUpgrade = () => {
    setIsPro(true);
    try { localStorage.setItem("kicksight_plan", "pro"); } catch {}
    setShowUpgradeModal(false);
  };

  const [deletingAccount, setDeletingAccount] = useState(false);
  const handleDeleteAccount = () => {
    const doDelete = async () => {
      setDeletingAccount(true);
      try {
        await apiRequest("/api/auth/account", { method: "DELETE" });
        logout();
        router.replace("/(auth)/login");
      } catch (err: any) {
        const msg = err.message || "Failed to delete account";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Error", msg);
      } finally {
        setDeletingAccount(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.")) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Delete Account",
        "Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ],
      );
    }
  };

  const currentLang = LANGUAGES.find(l => l.code === language);

  const initials = user?.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name || "User"}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email || ""}</Text>
          <TouchableOpacity
            style={[styles.memberBadge, { backgroundColor: isPro ? colors.accentBg : colors.card, borderWidth: isPro ? 0 : 1, borderColor: colors.border }]}
            onPress={() => !isPro && setShowUpgradeModal(true)}
            activeOpacity={isPro ? 1 : 0.7}
          >
            <Ionicons name={isPro ? "diamond" : "diamond-outline"} size={12} color={isPro ? colors.accent : colors.textMuted} />
            <Text style={[styles.memberText, { color: isPro ? colors.accent : colors.textMuted }]}>
              {isPro ? t.proPlan : t.freePlan}
            </Text>
            {!isPro && <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />}
          </TouchableOpacity>
        </Animated.View>

        {!isPro && (
          <TouchableOpacity
            style={[styles.upgradeCard, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "40" }]}
            onPress={() => setShowUpgradeModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.upgradeLeft}>
              <Ionicons name="diamond" size={24} color={colors.accent} />
              <View>
                <Text style={[styles.upgradeTitle, { color: colors.text }]}>{t.upgradeToPro}</Text>
                <Text style={[styles.upgradeDesc, { color: colors.textMuted }]}>{t.upgradeDesc}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </TouchableOpacity>
        )}

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t.settings}</Text>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.6}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t.notificationSettings}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={colors.textSecondary} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t.darkMode}</Text>
            <Switch
              value={isDark}
              onValueChange={toggle}
              trackColor={{ false: colors.border, true: colors.accent + "60" }}
              thumbColor={isDark ? colors.accent : "#FFFFFF"}
            />
          </View>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowLangModal(true)}
            activeOpacity={0.6}
          >
            <Ionicons name="globe-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t.language}</Text>
            <Text style={[styles.menuValue, { color: colors.textMuted }]}>{currentLang?.flag} {currentLang?.nativeName}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t.about}</Text>

          <MenuItem icon="information-circle-outline" label={t.version} value={appVersion} colors={colors} />
          <MenuItem icon="document-text-outline" label={t.termsOfService} colors={colors} />
          <MenuItem icon="shield-outline" label={t.privacyPolicy} colors={colors} onPress={() => router.push("/privacy-policy")} />

          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>{t.signOut}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteAccountBtn, { borderColor: colors.dangerBorder }]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            disabled={deletingAccount}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={[styles.logoutText, { color: colors.danger }]}>Delete Account</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={showLangModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.selectLanguage}</Text>
            <ScrollView style={styles.langList} showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langItem,
                    { borderBottomColor: colors.border },
                    language === lang.code && { backgroundColor: colors.accentBg },
                  ]}
                  onPress={() => {
                    setLanguage(lang.code);
                    setShowLangModal(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <View style={styles.langInfo}>
                    <Text style={[styles.langName, { color: colors.text }]}>{lang.nativeName}</Text>
                    <Text style={[styles.langNameEn, { color: colors.textMuted }]}>{lang.name}</Text>
                  </View>
                  {language === lang.code && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showUpgradeModal} transparent animationType="fade" onRequestClose={() => setShowUpgradeModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUpgradeModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={[styles.upgradeIconCircle, { backgroundColor: colors.accentBg }]}>
                <Ionicons name="diamond" size={32} color={colors.accent} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 4 }]}>{t.upgradeToPro}</Text>
              <Text style={[styles.upgradeModalDesc, { color: colors.textMuted }]}>{t.upgradeDesc}</Text>
            </View>

            <View style={[styles.planCompare, { borderColor: colors.border }]}>
              <View style={styles.planCol}>
                <Text style={[styles.planName, { color: colors.textMuted }]}>{t.freePlan}</Text>
                <View style={styles.planFeature}><Ionicons name="checkmark" size={14} color={colors.textMuted} /><Text style={[styles.planFeatureText, { color: colors.textMuted }]}>{t.aiAnalysis}</Text></View>
                <View style={styles.planFeature}><Ionicons name="close" size={14} color={colors.textMuted} /><Text style={[styles.planFeatureText, { color: colors.textMuted }]}>{t.bettingPicks}</Text></View>
                <View style={styles.planFeature}><Ionicons name="close" size={14} color={colors.textMuted} /><Text style={[styles.planFeatureText, { color: colors.textMuted }]}>{t.recommendedBet}</Text></View>
              </View>
              <View style={[styles.planDivider, { backgroundColor: colors.border }]} />
              <View style={styles.planCol}>
                <Text style={[styles.planName, { color: colors.accent }]}>{t.proPlan}</Text>
                <View style={styles.planFeature}><Ionicons name="checkmark" size={14} color={colors.accent} /><Text style={[styles.planFeatureText, { color: colors.text }]}>{t.aiAnalysis}</Text></View>
                <View style={styles.planFeature}><Ionicons name="checkmark" size={14} color={colors.accent} /><Text style={[styles.planFeatureText, { color: colors.text }]}>{t.bettingPicks}</Text></View>
                <View style={styles.planFeature}><Ionicons name="checkmark" size={14} color={colors.accent} /><Text style={[styles.planFeatureText, { color: colors.text }]}>{t.recommendedBet}</Text></View>
              </View>
            </View>

            <View style={{ alignItems: "center", marginTop: 16, marginBottom: 8 }}>
              <Text style={[styles.priceText, { color: colors.text }]}>$9.99<Text style={[styles.priceUnit, { color: colors.textMuted }]}>{t.perMonth}</Text></Text>
            </View>

            <TouchableOpacity style={[styles.subscribeBtn, { backgroundColor: colors.accent }]} onPress={handleUpgrade} activeOpacity={0.8}>
              <Text style={styles.subscribeBtnText}>{t.subscribe}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function MenuItem({ icon, label, value, colors, onPress }: { icon: any; label: string; value?: string; colors: any; onPress?: () => void }) {
  return (
    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.6} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      {value && <Text style={[styles.menuValue, { color: colors.textMuted }]}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  profileCard: {
    alignItems: "center",
    borderRadius: 20,
    padding: 28,
    marginBottom: 28,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    marginBottom: 14, borderWidth: 2,
  },
  avatarText: { fontSize: 24, fontFamily: "Inter_700Bold" },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  memberBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, marginTop: 12,
  },
  memberText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sectionTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 1, marginBottom: 8, marginTop: 4,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1,
  },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  menuValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 12, padding: 14, gap: 8, marginTop: 20, borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  deleteAccountBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 12, padding: 14, gap: 8, marginTop: 8, borderWidth: 1,
    backgroundColor: "transparent",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    maxHeight: 520,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
    textAlign: "center",
  },
  langList: {},
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 10,
    gap: 12,
  },
  langFlag: { fontSize: 24 },
  langInfo: { flex: 1 },
  langName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  langNameEn: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  upgradeCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1,
  },
  upgradeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  upgradeTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  upgradeDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  upgradeIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  upgradeModalDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  planCompare: { flexDirection: "row", borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  planCol: { flex: 1, padding: 14, gap: 10 },
  planDivider: { width: 1 },
  planName: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4 },
  planFeature: { flexDirection: "row", alignItems: "center", gap: 6 },
  planFeatureText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  priceText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  priceUnit: { fontSize: 14, fontFamily: "Inter_400Regular" },
  subscribeBtn: {
    borderRadius: 14, paddingVertical: 14,
    alignItems: "center", justifyContent: "center",
  },
  subscribeBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0B0F1A" },
});
