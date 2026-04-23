import React, { useRef, useEffect, useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";

import { LINE_WIDTH, line, centerText, leftRight, wrapText } from "./src/utils/text";
import { delay } from "./src/utils/delay";

import { connectPrinter } from "./src/printer/connectPrinter";
import { reconnectPrinter } from "./src/printer/reconnectPrinter";
import { ensurePrinterConnected } from "./src/printer/ensurePrinterConnected";

import { printBarcode } from "./src/print/printBarcode";
import { printSuratJalanThermal } from "./src/print/printSuratJalanThermal";
import { printStruk } from "./src/print/printStruk";

import { handleWebMessage } from "./src/webview/handleWebMessage";

export default function App() {
  const [printerStatus, setPrinterStatus] = useState("checking");
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const printerRef = useRef(null);

  // =======================
  // CHECK BEFORE PRINT
  // =======================
  const checkPrinterBeforePrint = async () => {
    if (printerRef.current) {
      const ok = await printerRef.current.isConnected();
      if (ok) return true;
    }
    setShowPrinterModal(true);
    return false;
  };

  // =======================
  // RECONNECT FROM UI
  // =======================
  const handleReconnectFromUI = async () => {
    try {
      setConnecting(true);
      const ok = await reconnectPrinter(printerRef, setPrinterStatus);
      if (ok) {
        setShowPrinterModal(false);
      }
    } finally {
      setConnecting(false);
    }
  };

  // =======================
  // EFFECT
  // =======================
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("sticky-immersive");
    connectPrinter(printerRef, setPrinterStatus);
  }, []);

  // =======================
  // WEBVIEW HANDLER
  // =======================
  const onMessage = (event) =>
    handleWebMessage(event, {
      printBarcode: (...args) =>
        printBarcode(...args, {
          printerRef,
          checkPrinterBeforePrint,
          reconnectPrinter,
        }),

      printSuratJalanThermal: (data) =>
        printSuratJalanThermal(data, {
          printerRef,
          checkPrinterBeforePrint,
          reconnectPrinter,
          LINE_WIDTH,
          line,
          leftRight,
          centerText,
          wrapText,
        }),

      printStruk: (data) =>
        printStruk(data, {
          printerRef,
          checkPrinterBeforePrint,
          reconnectPrinter,
        }),
    });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar hidden />

      <WebView
        source={{ uri: "https://posfajarterang-3f914.web.app/" }}
        // source={{ uri: "192.168.18.133:3000" }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
      />

      {showPrinterModal && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              padding: 24,
              borderRadius: 12,
              width: 280,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 18, marginBottom: 12 }}>
              Printer belum terhubung
            </Text>
            <Text style={{ textAlign: "center", marginBottom: 20 }}>
              Nyalakan printer dan sambungkan Bluetooth
            </Text>

            <TouchableOpacity
              onPress={handleReconnectFromUI}
              disabled={connecting}
              style={{
                backgroundColor: "#00c853",
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                width: "100%",
                alignItems: "center",
              }}
            >
              {connecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16 }}>
                  Sambungkan
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPrinterModal(false)}
              style={{ marginTop: 12 }}
            >
              <Text style={{ color: "#666" }}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}