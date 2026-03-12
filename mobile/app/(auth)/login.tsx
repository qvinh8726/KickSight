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
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { API_URL } from "@/lib/query-client";

const GOOGLE_CLIENT_ID = "1096780671141-s176tiftlpmg34hb91388536tm3ghr7c.apps.googleusercontent.com";

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGoogleAccessToken = async (accessToken: string) => {
    setGoogleLoading(true);
    setError("");
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userInfoRes.ok) throw new Error("Failed to get Google user info");
      const userInfo = await userInfoRes.json();
      await loginWithGoogle(accessToken, userInfo);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Google login failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = () => {
    setError("");
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const redirectUri = Platform.OS === "web"
      ? window.location.origin + "/"
      : `${API_URL}/api/auth/google/callback`;

    if (Platform.OS === "web") {
      sessionStorage.setItem("google_oauth_state", state);
    }

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent("openid profile email")}` +
      `&state=${encodeURIComponent(state)}` +
      `&prompt=select_account`;

    if (Platform.OS === "web") {
      window.location.href = googleAuthUrl;
    } else {
      Linking.openURL(googleAuthUrl);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
            <View style={[styles.logoCircle, { backgroundColor: colors.accentBg }]}>
              <View style={[styles.logoInner, { backgroundColor: colors.accentBg }]}>
                <Ionicons name="football" size={32} color={colors.accent} />
              </View>
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>WC2026 Betting AI</Text>
            <Text style={[styles.appTagline, { color: colors.textMuted }]}>AI-powered match analysis</Text>
          </Animated.View>

          <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.formSubtitle, { color: colors.textMuted }]}>Sign in to your account</Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Email address"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: colors.accent }, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#0B0F1A" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: colors.card, borderColor: colors.border }, googleLoading && styles.loginBtnDisabled]}
                onPress={handleGooglePress}
                disabled={googleLoading}
                activeOpacity={0.7}
              >
                {googleLoading ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color={colors.text} />
                    <Text style={[styles.socialBtnText, { color: colors.text }]}>Sign in with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.switchRow} onPress={() => router.push("/(auth)/register")}>
              <Text style={[styles.switchText, { color: colors.textMuted }]}>Don't have an account? </Text>
              <Text style={[styles.switchLink, { color: colors.accent }]}>Create one</Text>
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
  logoSection: { alignItems: "center", marginBottom: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  logoInner: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 24, fontFamily: "Inter_700Bold" },
  appTagline: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  formSection: {},
  formTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  formSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 20 },
  errorBox: { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: 12, gap: 8, marginBottom: 16, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  inputGroup: { gap: 12, marginBottom: 20 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 4 },
  loginBtn: { borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0B0F1A" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  socialRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  socialBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, height: 48, gap: 8, borderWidth: 1 },
  socialBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  switchRow: { flexDirection: "row", justifyContent: "center" },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
