import React, { useRef, useEffect } from "react";
import { SafeAreaView } from "react-native";
import { WebView } from "react-native-webview";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import { PermissionsAndroid, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";

export default function App() {

  const printerRef = useRef(null);

  const LINE_WIDTH = 48;

  const line = () => "-".repeat(LINE_WIDTH) + "\n";

  const centerText = (text) => {
    if (text.length >= LINE_WIDTH) return text + "\n";
    const space = Math.floor((LINE_WIDTH - text.length) / 2);
    return " ".repeat(space) + text + "\n";
  };

  const leftRight = (left, right) => {
    const totalWidth = LINE_WIDTH;

    // ❗ karena double width → hitung 2x
    const leftLen = left.length * 2;
    const rightLen = right.length * 2;

    let space = totalWidth - leftLen - rightLen;

    // fallback biar ga minus
    if (space < 2) space = 2;

    // karena tiap char = 2 width → bagi 2
    const spaceChar = Math.floor(space / 2);

    return left + " ".repeat(spaceChar) + right + "\n";
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

    console.log("CONNECT RESULT:", connected);

    const real = await printer.isConnected();
    console.log("REAL CONNECTION:", real);

    printerRef.current = printer;

    global.printerAddress = printer.address;

  } catch (err) {
    console.log("CONNECT ERROR:", err);
  }
};

const reconnectPrinter = async () => {

  try {

    if (!global.printerAddress) return false;

    const printer = await RNBluetoothClassic.connectToDevice(
      global.printerAddress
    );

    printerRef.current = printer;

    console.log("RECONNECTED");

    return true;

  } catch (e) {

    console.log("RECONNECT FAILED", e);

    return false;

  }

};

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("sticky-immersive");
    connectPrinter();

    const intertval = setInterval(() => {
      if (!printerRef.current) {
        reconnectPrinter();
      }
    }, 5000);
    
    return () => clearInterval(intertval);
  }, []);

const printBarcode = async (barcode, berat, produkNama, kategori) => {
  const p = printerRef.current;

  if (!p) {
    console.log("Printer not connected");

    const ok = await reconnectPrinter();

    if (!ok) {
      console.log("Cannot reconnect to printer");
      return;
    }

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
    let p = printerRef.current;

    if (!p) {
      const ok = await reconnectPrinter();
      if (!ok) return;
      p = printerRef.current;
    }

    await p.write("\x1B\x40"); // RESET

    // ================= HEADER =================
    await p.write(centerText("TOKO FAJAR TERANG"));
    await p.write(centerText("Ruko Auri, Jl. Anggrek IV No.17"));
    await p.write(centerText("Jakarta Pusat"));
    await p.write(centerText("Telp: 021-XXXXXXX"));

    await p.write(line());

    // ================= TITLE =================
    await p.write("\x1B\x61\x01"); // center
    await p.write("\x1D\x21\x10"); // tinggi doang (biar ga kepotong)
    await p.write("SURAT JALAN MUTASI\n");
    await p.write("\x1D\x21\x00");

    await p.write(line());
    await p.write("\x1B\x61\x00");

    // ================= INFO =================
    await p.write(`No   : ${data.sjId}\n`);
    await p.write(`Tgl  : ${data.tanggal}\n`);
    await p.write(`Dari : ${data.gudangAsal}\n`);
    await p.write(`Ke   : ${data.gudangTujuan}\n`);
    await p.write(`User : ${data.adminPengirim}\n`);

    await p.write("\x1B\x61\x01");
    await p.write(line());
    await p.write("\x1B\x61\x00");

    // ================= GROUPING =================
    const grouped = {};

    data.items.forEach((item) => {
      const kategori = item.kategori || "LAINNYA";
      const produk = item.produkNama || "PRODUK";

      if (!grouped[kategori]) grouped[kategori] = {};
      if (!grouped[kategori][produk]) grouped[kategori][produk] = [];

      grouped[kategori][produk].push(item.rollId);
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
        await p.write("\x1D\x21\x11");

        // produk (indent 2 spasi)
        await p.write("\x1B\x45\x01");
        await p.write(leftRight("  " + produk.toUpperCase(), String(rolls.length)));

        // roll (indent 4 spasi)
        for (let r of rolls) {
          await p.write("    " + r + "\n");
        }

        await p.write("\x1B\x45\x00");
        await p.write("\x1D\x21\x00"); // tetap dipertahankan
      }
    }

    await p.write("\x1B\x61\x01");
    await p.write(line());
    await p.write("\x1B\x61\x00");

    // ================= TOTAL =================
    await p.write("\x1D\x21\x11");
    await p.write("\n");
    await p.write(leftRight("TOTAL ROLL:", `${data.totalRolls}`));
    await p.write("\x1D\x21\x00");

    // ================= CATATAN =================
    if (data.catatan && data.catatan !== "-") {
      await p.write(line());
      await p.write("CATATAN:\n");
      await p.write(wrapText(data.catatan, " "));
    }

    // ================= SIGN =================
    await p.write("\n");
    await p.write("Pengirim,\n\n\n");
    await p.write(`(${data.adminPengirim})\n`);

    // ================= FOOTER =================
    await p.write("\n");
    await p.write(centerText(`${data.gudangAsal} -> ${data.gudangTujuan}`));
    await p.write(centerText(data.sjId));

    await p.write("\n\n\n\n");
  };

  const printStruk = async (data) => {
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


  const formatTanggalShort = (isoString) => {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

  // Group items
  const groupItems = (items) => {
    const groups = {};
    items.forEach((item) => {
      const key = `${item.produkNama}_${item.harga_per_kg}`;
      if (!groups[key]) {
        groups[key] = {
          nama: item.produkNama,
          harga: item.harga_per_kg,
          tipe: item.tipe,
          totalBerat: 0,
          ids: [],
          qty: 0,
        };
      }
      const berat =
        item.tipe === "ROL"
          ? parseFloat(item.berat || 0)
          : parseFloat(item.berat_jual || 0);

      groups[key].totalBerat += berat;
      groups[key].qty++;

      const shortId = String(item.rollId).slice(-4);
      groups[key].ids.push(shortId);
    });
    return Object.values(groups);
  };

  const chunkIds = (ids) => {
    const result = [];
    for (let i = 0; i < ids.length; i += 3) {
      result.push(ids.slice(i, i + 3).join("; "));
    }
    return result;
  };

  const grouped = groupItems(data.items);

  const safeText = (val) =>
  val && String(val).trim() !== "" ? String(val).toUpperCase() : "-";

  await p.write("\x1B\x40"); // reset

  // HEADER
  await p.write(center("TOKO FAJAR TERANG"));
  await p.write(center("Jl. KH. Fachrudin No.36, Blok AA No.17"));
  await p.write(center("Komplek Ruko Auri, Tanah Abang"));
  await p.write(center("Jakarta Pusat 10250"));
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

  // ITEMS
  for (let item of grouped) {
    const totalHarga = item.totalBerat * item.harga;

    await p.write(boldOn);
    await p.write(left(toAscii(item.nama.toUpperCase())));
    await p.write(boldOff);

    await p.write(right("Total", cleanRp(totalHarga)));
    await p.write(left(safeMultiply(item.totalBerat, item.harga)));
    await p.write(left(`${item.qty} Roll`));

    const idChunks = chunkIds(item.ids);
    for (let c of idChunks) {
      await p.write(left(`ID: ${c}`));
    }

    await p.write(left(item.tipe));
    await p.write(lineStruk());
  }

  // TOTAL SECTION
  const subtotal = Number(data.totalHarga) || 0;
  const ongkir = Number(data.ongkir) || 0;
  const potongan = Number(data.potongan) || 0;
  const totalFinal = subtotal + ongkir - potongan;

  await p.write(right("Subtotal", cleanRp(subtotal)));
  if (ongkir > 0){
    await p.write(right("Ongkir", cleanRp(ongkir)));
  }
  if (potongan > 0){
    await p.write(right("Potongan", cleanRp(potongan)));
  }
  await p.write(lineStruk());
  await p.write(boldOn);
  await p.write(right("TOTAL:", cleanRp(totalFinal)));
  await p.write(boldOff);

  await p.write(right("Dibayar:", cleanRp(data.jumlah_dibayar)));
  await p.write(right("Kembalian:", cleanRp(data.kembalian)));

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
    console.log("Message not JSON");
    return;
  }

  console.log("PARSED:", msg);

  if (msg.type === "PRINT_BARCODE") {

    if (!printerRef.current) {
      console.log("Printer not connected");
      return;
    }

    await printBarcode(msg.barcode, msg.berat, msg.produkNama, msg.kategori);

    console.log("BARCODE PRINTED");

  }
  if (msg.type === "PRINT_SURAT_JALAN_MUTASI_THERMAL") {
    await printSuratJalanThermal(msg.data);
  }
  if (msg.type === "PRINT_NOTA_PENJUALAN_THERMAL"){
    await printStruk(msg.data);
  }
};

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar hidden={true} />

      <WebView
        source={{ uri: "https://posfajarterang-3f914.web.app/" }}
        // source={{uri: "http://192.168.18.70:3000"}}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </SafeAreaView>
  );
}