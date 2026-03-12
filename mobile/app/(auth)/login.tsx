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
import { API_URL } from "@/lib/query-client";

const GOOGLE_CLIENT_ID = "1096780671141-s176tiftlpmg34hb91388536tm3ghr7c.apps.googleusercontent.com";

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
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

  useEffect(() => {
    if (Platform.OS === "web") {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token=")) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const returnedState = params.get("state");
        const savedState = sessionStorage.getItem("google_oauth_state");
        sessionStorage.removeItem("google_oauth_state");
        if (accessToken && returnedState && returnedState === savedState) {
          window.history.replaceState(null, "", window.location.pathname);
          handleGoogleAccessToken(accessToken);
        } else if (accessToken && !savedState) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
    }
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
      ? window.location.origin + window.location.pathname
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
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoCircle}>
              <View style={styles.logoInner}>
                <Ionicons name="football" size={32} color="#00E676" />
              </View>
            </View>
            <Text style={styles.appName}>WC2026 Betting AI</Text>
            <Text style={styles.appTagline}>AI-powered match analysis</Text>
          </Animated.View>

          <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.formTitle}>Welcome back</Text>
            <Text style={styles.formSubtitle}>Sign in to your account</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#FF5252" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color="#4A5568" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#4A5568"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#4A5568" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#4A5568"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#4A5568" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
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
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialBtn, googleLoading && styles.loginBtnDisabled]}
                onPress={handleGooglePress}
                disabled={googleLoading}
                activeOpacity={0.7}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                    <Text style={styles.socialBtnText}>Sign in with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={styles.switchText}>Don't have an account? </Text>
              <Text style={styles.switchLink}>Create one</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F1A" },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoSection: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#00E67615",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#00E67620",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  appTagline: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#4A5568", marginTop: 4 },
  formSection: {},
  formTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 },
  formSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#4A5568", marginBottom: 20 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF525215",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FF525230",
  },
  errorText: { fontSize: 13, color: "#FF5252", fontFamily: "Inter_500Medium", flex: 1 },
  inputGroup: { gap: 12, marginBottom: 20 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131B2E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1C2540",
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#FFFFFF",
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: { padding: 4 },
  loginBtn: {
    backgroundColor: "#00E676",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0B0F1A" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#1C2540" },
  dividerText: { fontSize: 12, color: "#4A5568", fontFamily: "Inter_400Regular" },
  socialRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#131B2E",
    borderRadius: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  socialBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  switchRow: { flexDirection: "row", justifyContent: "center" },
  switchText: { fontSize: 14, color: "#4A5568", fontFamily: "Inter_400Regular" },
  switchLink: { fontSize: 14, color: "#00E676", fontFamily: "Inter_600SemiBold" },
});
