import React, { useRef, useEffect, useState } from "react";
import { WebView } from "react-native-webview";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import { PermissionsAndroid, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";

export default function App() {

  const [printerStatus, setPrinterStatus] = useState("checking");
  const [showPrinterModal, setShowPrinterModal] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);

  const printerRef = useRef(null);

  const LINE_WIDTH = 48;

  const line = () => "-".repeat(LINE_WIDTH) + "\n";

  const centerText = (text) => {
    if (text.length >= LINE_WIDTH) return text + "\n";
    const space = Math.floor((LINE_WIDTH - text.length) / 2);
    return " ".repeat(space) + text + "\n";
  };

  // const leftRight = (left, right) => {
  //   const totalWidth = LINE_WIDTH;

  //   // ❗ karena double width → hitung 2x
  //   const leftLen = left.length;
  //   const rightLen = right.length;

  //   let space = totalWidth - leftLen - rightLen;

  //   // fallback biar ga minus
  //   if (space < 2) space = 2;

  //   // karena tiap char = 2 width → bagi 2
  //   const spaceChar = Math.floor(space / 2);

  //   return left + " ".repeat(spaceChar) + right + "\n";
  // };

  const leftRight = (left, right) => {
    let space = LINE_WIDTH - left.length - right.length;
    if (space < 1) space = 1;
    return left + " ".repeat(space) + right + "\n";
  };

  // wrap text biar ga kepotong
  const wrapText = (text, indent = "") => {
    const max = LINE_WIDTH - indent.length;
    let result = "";

    while (text.length > max) {
      result += indent + text.slice(0, max) + "\n";
      text = text.slice(max);
    }

    result += indent + text + "\n";
    return result;
  };

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

  // HELPER
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const checkPrinterBeforePrint = async () => {
  if (printerRef.current) {
    const ok = await printerRef.current.isConnected();
    if (ok) return true;
  }

  // ❌ belum connect → tampilkan UI
  setShowPrinterModal(true);
  return false;
};

const handleReconnectFromUI = async () => {
  try {
    setConnecting(true);

    const ok = await reconnectPrinter();

    if (ok) {
      setShowPrinterModal(false); // tutup UI
    }
  } finally {
    setConnecting(false);
  }
};


// =======================
// SAFE DISCONNECT
// =======================
const safeDisconnect = async () => {
  try {
    if (printerRef.current) {
      const connected = await printerRef.current.isConnected();
      if (connected) {
        await printerRef.current.disconnect();
      }
    }
  } catch {}
  finally {
    printerRef.current = null;
    setPrinterStatus("disconnected");
  }
};

// =======================
// INITIAL CONNECT
// =======================
const connectPrinter = async () => {
  try {
    setPrinterStatus("checking");

    await requestBluetoothPermission();

    const devices = await RNBluetoothClassic.getBondedDevices();

    const printer = devices.find(d =>
      d.name?.toLowerCase().startsWith("rpp02n")
    );

    if (!printer) {
      setPrinterStatus("disconnected");
      return;
    }

    await safeDisconnect();
    await delay(3000);

    await printer.connect();

    const real = await printer.isConnected();
    if (!real) throw new Error("Not really connected");

    printerRef.current = printer;
    global.printerAddress = printer.address;

    setPrinterStatus("connected");
  } catch (e) {
    printerRef.current = null;
    setPrinterStatus("disconnected");
  }
};

// =======================
// RECONNECT
// =======================
const reconnectPrinter = async () => {
  try {
    if (!global.printerAddress) {
      setPrinterStatus("disconnected");
      return false;
    }

    setPrinterStatus("checking");

    await safeDisconnect();
    await delay(3000);

    const printer = await RNBluetoothClassic.connectToDevice(
      global.printerAddress
    );

    const real = await printer.isConnected();
    if (!real) throw new Error("Socket not connected");

    printerRef.current = printer;
    setPrinterStatus("connected");
    return true;
  } catch {
    printerRef.current = null;
    setPrinterStatus("disconnected");
    return false;
  }
};

// =======================
// ENSURE CONNECTION (PAKAI SEBELUM PRINT)
// =======================
const ensurePrinterConnected = async () => {
  try {
    if (!printerRef.current) {
      return await reconnectPrinter();
    }

    const connected = await printerRef.current.isConnected();
    if (!connected) {
      printerRef.current = null;
      return await reconnectPrinter();
    }

    return true;
  } catch {
    printerRef.current = null;
    return false;
  }
};

// =======================
// EFFECT
// =======================
useEffect(() => {
  NavigationBar.setVisibilityAsync("hidden");
  NavigationBar.setBehaviorAsync("sticky-immersive");

  connectPrinter();

  // const interval = setInterval(async () => {
  //   try {
  //     if (!printerRef.current) {
  //       await reconnectPrinter();
  //       return;
  //     }

  //     const connected = await printerRef.current.isConnected();
  //     if (!connected) {
  //       console.log("⚠️ Socket closed, reconnecting...");
  //       printerRef.current = null;
  //       await reconnectPrinter();
  //     }
  //   } catch (e) {
  //     console.log("INTERVAL CHECK ERROR", e.message);
  //     printerRef.current = null;
  //   }
  // }, 5000);

  // return () => clearInterval(interval);
}, []);
      

const printBarcode = async (barcode, berat, produkNama, kategori) => {
  
  
const ready = await checkPrinterBeforePrint();
  if (!ready) return;

  let p = printerRef.current;

  if (!p) {
    const ok = await reconnectPrinter();
    if (!ok) return;
    p = printerRef.current;
  }


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

  await p.write("\x1D\x21\x11"); // double width & height

  await p.write(kategori + "-" + produkNama);
  await p.write("\n");

  await p.write("\x1B\x64\x01"); // line feed

  await p.write(barcode);
  await p.write("\n");

  await p.write("\x1B\x64\x01"); // line feed

  await p.write(berat + " KG");

  await p.write("\n\n\n\n");
  await p.write(" ");

  await p.write("\x1D\x21\x00");
};

  const printSuratJalanThermal = async (data) => {
    
  
  const ready = await checkPrinterBeforePrint();
    if (!ready) return;

    let p = printerRef.current;

    const MAX = 48;

    if (!p) {
      const ok = await reconnectPrinter();
      if (!ok) return;
      p = printerRef.current;
    }

    const viaName =
        data.via && String(data.via).trim() !== ""
          ? String(data.via).toUpperCase()
          : "-";

    const right = (label, value) => {
      const space = MAX - (label.length + value.length);
      return `${label}${" ".repeat(space > 1 ? space : 1)}${value}\n`;
    };      

    await p.write("\x1B\x40"); // RESET

    // ================= HEADER =================
    await p.write(centerText("FAJAR TERANG"));
    await p.write(centerText("Ruko Auri, Jl. Anggrek IV No.17"));
    await p.write(centerText("Jakarta Pusat"));
    await p.write(centerText("Telp: 0811-239-191/0899-9522-200"));

    await p.write(line());

    // ================= TITLE =================
    await p.write("\x1B\x61\x01"); // center
    await p.write("\x1D\x21\x10"); // tinggi doang (biar ga kepotong)
    await p.write("SURAT JALAN\n");
    await p.write("\x1D\x21\x00");

    await p.write(line());
    await p.write("\x1B\x61\x00");

    // ================= INFO =================
    await p.write(`No   : ${data.sjId}\n`);
    await p.write(`Tgl  : ${data.tanggal}\n`);

    if (data.mode === "CUSTOMER") {
      await p.write(`Kpd  : ${data.customerNama}\n`);
    } else {
      await p.write(`Dari : ${data.gudangAsal}\n`);
      await p.write(`Ke   : ${data.gudangTujuan}\n`);
    }

    await p.write(`User : ${data.adminPengirim}\n`);

    await p.write("\x1B\x61\x01");
    await p.write(line());
    await p.write("\x1B\x61\x00");

   // ================= GROUPING =================
      const grouped = {};

      data.items.forEach((item) => {
        const kategori = item.kategori || "-";
        const produk = item.produkNama || "PRODUK";

        if (!grouped[kategori]) grouped[kategori] = {};
        if (!grouped[kategori][produk]) grouped[kategori][produk] = [];

        grouped[kategori][produk].push({
          rollId: item.rollId,
          berat: Number(item.berat) || 0, // ✅ AMBIL BERAT PER ROLL
        });
      });

    // ================= ITEMS =================
    for (let kategori in grouped) {
      await p.write("\n");
      await p.write("\x1D\x21\x11");
      await p.write("\x1B\x45\x01");
      await p.write(kategori.toUpperCase() + "\n");
      await p.write("\x1B\x45\x00");

      for (let produk in grouped[kategori]) {
        const rolls = grouped[kategori][produk];

        // ✅ TAMBAHAN INI (FIX BUG)
        await p.write("\x1D\x21\x00");

        // produk (indent 2 spasi)
        await p.write("\x1B\x45\x01");
        await p.write(leftRight("  " + produk.toUpperCase(), String(rolls.length)));

        // roll (indent 4 spasi)
        for (let r of rolls) {
          // const kiri = "    " + r.rollId;
          // const kanan = `${r.berat.toFixed(2)} KG`;
          // await p.write(leftRight(kiri, kanan));
          await p.write(leftRight("    " + r.rollId, `${r.berat.toFixed(2)} KG`));
        }

        await p.write("\x1B\x45\x00");
        await p.write("\x1D\x21\x00"); // tetap dipertahankan
      }
    }

    await p.write("\x1B\x61\x01");
    await p.write(line());
    await p.write("\x1B\x61\x00");

    await p.write(right("Total Berat:", data.totalBerat + " Kg"));

    // ================= TOTAL =================
    await p.write("\x1D\x21\x10");
    await p.write("\n");
    if (data.mode !== "CUSTOMER") {
      await p.write(centerText(`${data.gudangAsal} -> ${data.gudangTujuan}`));
    }
    await p.write("\x1D\x21\x00");

    // ================= CATATAN =================
    if (data.catatan && data.catatan !== "-") {
      await p.write(line());
      await p.write("CATATAN:\n");
      await p.write(wrapText(data.catatan, " "));
    }

    // ================= SIGN =================
    await p.write("\n");
    await p.write("Pengirim,\n\n\n\n");
    await p.write(`(${data.adminPengirim})\n\n`);

    await p.write("\n");
    await p.write("Penerima,\n\n\n\n");
    await p.write(`(${viaName})\n`);

    // ================= FOOTER =================
    await p.write("\n");
    await p.write(centerText(data.sjId));

    await p.write("\n\n\n\n");
  };

  const printStruk = async (data) => {
    
  
const ready = await checkPrinterBeforePrint();
  if (!ready) return;

  let p = printerRef.current;

  if (!p) {
    const ok = await reconnectPrinter();
    if (!ok) return;
    p = printerRef.current;
  }


  const MAX = 48;

  const boldOn = "\x1B\x45\x01";
  const boldOff = "\x1B\x45\x00";

  const center = (t) => `\x1B\x61\x01${t}\n`;
  const left = (t) => `\x1B\x61\x00${t}\n`;

  const right = (label, value) => {
    const space = MAX - (label.length + value.length);
    return `${label}${" ".repeat(space > 1 ? space : 1)}${value}\n`;
  };

  const cleanRp = (n) =>
  formatRupiah(n)
    .replace(/[^\x00-\x7F]/g, "")     // remove unicode like U+202F
    .replace(/\s+/g, " ");            // normalize spaces

  // FIX 1: line ASCII-only
  const lineStruk = () => "-".repeat(MAX) + "\n";

  // FIX 2: safe multiply string (ASCII only)
  const safeMultiply = (berat, harga) =>
    `${berat.toFixed(2)} Kg x ${formatRupiah(harga)}`.replace(/[^\x00-\x7F]/g, "");

  // FIX 3: remove Unicode
  const toAscii = (text) =>
    text.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");

  const formatRupiah = (n) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n || 0);


  const formatTanggalShort = (value) => {
  if (!value) return "-";

  let d;

  // ✅ Firestore Timestamp
  if (typeof value.toDate === "function") {
    d = value.toDate();
  }
  // ✅ Unix timestamp (seconds)
  else if (value.seconds) {
    d = new Date(value.seconds * 1000);
  }
  // ✅ ISO string / Date
  else {
    d = new Date(value);
  }

  if (isNaN(d)) return "-";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

  // Group items
  const groupItems = (items) => {
    const groups = {};

    items.forEach((item) => {
      const kategori = item.kategori || "LAINNYA";
      const key = `${kategori}_${item.produkNama}_${item.harga_per_kg}`;

      if (!groups[key]) {
        groups[key] = {
          kategori,
          nama: item.produkNama,
          harga: item.harga_per_kg,
          tipe: item.tipe,
          totalBerat: 0,
          qty: 0,
          rolls: [], // ✅ SIMPAN ID + BERAT
        };
      }

      const berat =
        item.tipe === "ROL"
          ? parseFloat(item.berat || 0)
          : parseFloat(item.berat_jual || 0);

      const shortId = String(item.rollId || "").slice(-4);

      groups[key].totalBerat += berat;
      groups[key].qty += 1;

      groups[key].rolls.push({
        id: shortId,
        berat,
      });
    });

    // ✅ SORT RAPi PER KATEGORI
    return Object.values(groups).sort((a, b) =>
      a.kategori.localeCompare(b.kategori)
    );
  };

  const chunkIds = (ids) => {
    const result = [];
    for (let i = 0; i < ids.length; i += 3) {
      result.push(ids.slice(i, i + 3).join("; "));
    }
    return result;
  };

  const grouped = groupItems(data.items);

  const groupedByKategori = grouped.reduce((acc, item) => {
    if (!acc[item.kategori]) acc[item.kategori] = [];
    acc[item.kategori].push(item);
    return acc;
  }, {});

  const safeText = (val) =>
  val && String(val).trim() !== "" ? String(val).toUpperCase() : "-";

  await p.write("\x1B\x40"); // reset

  // HEADER
  await p.write(center("FAJAR TERANG"));
  await p.write(center("Ruko Auri, Jl. Anggrek IV Blok AA No.17"));
  await p.write(center("Telp: 0811-239-191/0899-9522-200"));
  await p.write("\n");

  await p.write(boldOn);
  await p.write(center("NOTA PENJUALAN"));
  await p.write(boldOff);

  await p.write(lineStruk());

  // INFO
  await p.write(right("No Nota:", data.nomorNota));
  await p.write(right("Tanggal:", formatTanggalShort(data.tanggal)));
  await p.write(right("Customer:", safeText(data.customer?.nama.toUpperCase())));
  await p.write(right("Kasir:", data.kasir.toUpperCase()));

  await p.write(lineStruk());

  // ITEMS PER KATEGORI
  for (const [kategori, items] of Object.entries(groupedByKategori)) {

    // HEADER KATEGORI
    await p.write(boldOn);
    await p.write(center(toAscii(kategori)));
    await p.write(boldOff);
    await p.write(lineStruk());

    for (let item of items) {
      const totalHarga = item.totalBerat * item.harga;

      // NAMA + TOTAL
      await p.write(boldOn);
      await p.write(left(toAscii(item.nama.toUpperCase())));
      await p.write(boldOff);

      await p.write(right("Rp", cleanRp(totalHarga)));
      await p.write(left(
        `${item.totalBerat.toFixed(2)} Kg x ${cleanRp(item.harga)}`
      ));
      await p.write(left(`${item.qty} Roll`));

      // ✅ ID + BERAT PER ROLL
      for (let r of item.rolls) {
        await p.write(
          left(`ID: ${r.id} (${r.berat.toFixed(2)} Kg)`)
        );
      }

      await p.write(left(item.tipe));
      await p.write(lineStruk());
    }
  }

  await p.write(right("Total Berat:", data.total_berat.toFixed(2) + " Kg"));
  await p.write(lineStruk());

  // TOTAL SECTION
  const subtotal = Number(data.subtotal) || 0;
  const ongkir = Number(data.ongkir) || 0;
  const potongan = Number(data.potongan) || 0;
  const totalFinal = subtotal + ongkir - potongan;

  await p.write(right("Subtotal:", cleanRp(subtotal)));
  if (ongkir > 0){
    await p.write(right("Ongkir:", cleanRp(ongkir)));
  }
  if (potongan > 0){
    await p.write(right("Potongan:", cleanRp(potongan)));
  }
  await p.write(lineStruk());
  await p.write(boldOn);
  await p.write(right("TOTAL:", cleanRp(totalFinal)));
  await p.write(boldOff);

  await p.write(right("Metode Pembayaran:", safeText(data.metodePembayaran)));

  await p.write(lineStruk());

  // FOOTER
  await p.write(center("Terima Kasih"));

  await p.write("\n\n\n");
};

  const handleMessage = async (event) => {
  console.log("RAW MESSAGE:", event.nativeEvent.data);

  let msg;
  try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (msg.type === "PRINT_BARCODE") {
      await printBarcode(
        msg.barcode,
        msg.berat,
        msg.produkNama,
        msg.kategori
      );
    }

    if (msg.type === "PRINT_SURAT_JALAN_THERMAL") {
      await printSuratJalanThermal(msg.data);
    }

    if (msg.type === "PRINT_NOTA_PENJUALAN_THERMAL") {
      await printStruk(msg.data);
    }
  };


  return (
  <SafeAreaView style={{ flex: 1 }}>
    <StatusBar hidden />

    <WebView
      // source={{ uri: "https://posfajarterang-3f914.web.app/" }}
      source={{ uri: "192.168.18.158:3000" }}
      onMessage={handleMessage}
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
          <Text style={{ color: "#fff", fontSize: 16 }}>Sambungkan</Text>
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