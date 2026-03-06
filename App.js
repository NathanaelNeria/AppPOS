import React, { useRef, useEffect } from "react";
import { SafeAreaView } from "react-native";
import { WebView } from "react-native-webview";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import { PermissionsAndroid, Platform } from "react-native";

export default function App() {

  const printerRef = useRef(null);

  console.log("BT CLASSIC:", RNBluetoothClassic);

  const requestBluetoothPermission = async () => {
  if (Platform.OS === "android" && Platform.Version >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    ]);

    console.log("PERMISSIONS:", granted);
  }
};

  const connectPrinter = async () => {
  try {

    await requestBluetoothPermission();

    const devices = await RNBluetoothClassic.getBondedDevices();

    console.log("BONDED DEVICES:", devices);

    if (devices.length === 0) {
      console.log("No paired printer");
      return;
    }

    const printer = devices[0];

    const connected = await printer.connect();

    console.log("CONNECTED:", connected);

    printerRef.current = printer;

  } catch (err) {
    console.log("CONNECT ERROR:", err);
  }
};

  useEffect(() => {
    connectPrinter();
  }, []);

const printBarcode = async (barcode) => {
  const p = printerRef.current;
  if (!p) return;

  await p.write("\x1B\x40"); // reset printer

  await p.write("\x1B\x61\x01"); // center align

  await p.write("\x1D\x48\x00"); // angka di bawah barcode

  await p.write("\x1D\x77\x02") // width

  await p.write("\x1D\x68\x90")  // height

  const cmd =
    "\x1D\x6B\x49" +
    String.fromCharCode(barcode.length) +
    barcode;

  await p.write(cmd);

  await p.write("\x1B\x64\x01"); // line feed

  await p.write(barcode);

  await p.write("\n\n\n");
};

  const handleMessage = async (event) => {
  console.log("RAW MESSAGE:", event.nativeEvent.data);

  let msg;

  try {
    msg = JSON.parse(event.nativeEvent.data);
  } catch {
    console.log("Message not JSON");
    return;
  }

  console.log("PARSED:", msg);

  if (msg.type === "PRINT_BARCODE") {

    if (!printerRef.current) {
      console.log("Printer not connected");
      return;
    }

    await printBarcode(msg.barcode);

    console.log("BARCODE PRINTED");

  }
};

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView
        source={{ uri: "http://192.168.18.158:3000" }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </SafeAreaView>
  );
}