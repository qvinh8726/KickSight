import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const getStrengthLabel = () => {
    if (password.length === 0) return "";
    if (password.length < 4) return t.weak;
    if (password.length < 6) return t.passwordFair;
    if (password.length < 8) return t.good;
    return t.strong;
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t.createAccount}</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>{t.joinApp}</Text>
          </Animated.View>

          <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={[styles.input, { color: colors.text }]} placeholder={t.fullName} placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoCapitalize="words" />
              </View>

              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={[styles.input, { color: colors.text }]} placeholder={t.emailAddress} placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </View>

              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={[styles.input, { color: colors.text }]} placeholder={t.password} placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.strengthRow}>
              <View style={[styles.strengthBar, { backgroundColor: colors.border }, password.length >= 2 && { backgroundColor: colors.orange }]} />
              <View style={[styles.strengthBar, { backgroundColor: colors.border }, password.length >= 4 && { backgroundColor: colors.orange }]} />
              <View style={[styles.strengthBar, { backgroundColor: colors.border }, password.length >= 6 && { backgroundColor: colors.accent }]} />
              <View style={[styles.strengthBar, { backgroundColor: colors.border }, password.length >= 8 && { backgroundColor: colors.accent }]} />
            </View>
            <Text style={[styles.strengthLabel, { color: colors.textMuted }]}>
              {getStrengthLabel()}
            </Text>

            <TouchableOpacity
              style={[styles.registerBtn, { backgroundColor: colors.accent }, loading && styles.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#0B0F1A" size="small" />
              ) : (
                <Text style={styles.registerBtnText}>{t.register}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchRow} onPress={() => router.back()}>
              <Text style={[styles.switchText, { color: colors.textMuted }]}>{t.haveAccount} </Text>
              <Text style={[styles.switchLink, { color: colors.accent }]}>{t.signInHere}</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  headerSection: { marginBottom: 32 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  formSection: {},
  errorBox: { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: 12, gap: 8, marginBottom: 16, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  inputGroup: { gap: 12, marginBottom: 16 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 4 },
  strengthRow: { flexDirection: "row", gap: 4, marginBottom: 4 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 24, height: 16 },
  registerBtn: { borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  registerBtnDisabled: { opacity: 0.7 },
  registerBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0B0F1A" },
  switchRow: { flexDirection: "row", justifyContent: "center" },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
