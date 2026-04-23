const printStruk = async (
  data,
  {
    printerRef,
    checkPrinterBeforePrint,
    reconnectPrinter,
  }
) => {

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

  const formatRupiah = (n) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n || 0);

  const cleanRp = (n) =>
    formatRupiah(n)
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/\s+/g, " ");

  const lineStruk = () => "-".repeat(MAX) + "\n";

  const safeMultiply = (berat, harga) =>
    `${berat.toFixed(2)} Kg x ${formatRupiah(harga)}`
      .replace(/[^\x00-\x7F]/g, "");

  const toAscii = (text) =>
    text.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");

  const formatTanggalShort = (value) => {
    if (!value) return "-";
    let d;

    if (typeof value.toDate === "function") {
      d = value.toDate();
    } else if (value.seconds) {
      d = new Date(value.seconds * 1000);
    } else {
      d = new Date(value);
    }

    if (isNaN(d)) return "-";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
          rolls: [],
        };
      }

      const berat =
        item.tipe === "ROL"
          ? parseFloat(item.berat || 0)
          : parseFloat(item.berat_jual || item.berat || 0);

      const shortId = String(item.rollId || "").slice(-4);

      groups[key].totalBerat += berat;
      groups[key].qty += 1;
      groups[key].rolls.push({ id: shortId, berat });
    });

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

  await p.write("\x1B\x40");

  await p.write(center("FAJAR TERANG"));
  await p.write(center("Ruko Auri, Jl. Anggrek IV Blok AA No.17"));
  await p.write(center("Telp: 0811-239-191/0899-9522-200"));
  await p.write("\n");

  await p.write(boldOn);
  await p.write(center("NOTA PENJUALAN"));
  await p.write(boldOff);
  await p.write(lineStruk());

  await p.write(right("No Nota:", data.nomorNota));
  await p.write(right("Tanggal:", formatTanggalShort(data.tanggal)));
  await p.write(
    right("Customer:", safeText(data.customer?.nama.toUpperCase()))
  );
  await p.write(right("Kasir:", data.kasir.toUpperCase()));
  await p.write(lineStruk());

  for (const [kategori, items] of Object.entries(groupedByKategori)) {
    await p.write(boldOn);
    await p.write(center(toAscii(kategori)));
    await p.write(boldOff);
    await p.write(lineStruk());

    for (let item of items) {
      const totalHarga = item.totalBerat * item.harga;

      await p.write(boldOn);
      await p.write(left(toAscii(item.nama.toUpperCase())));
      await p.write(boldOff);
      await p.write(right("Rp", cleanRp(totalHarga)));
      await p.write(
        left(`${item.totalBerat.toFixed(2)} Kg x ${cleanRp(item.harga)}`)
      );
      await p.write(left(`${item.qty} Roll`));

      for (let r of item.rolls) {
        await p.write(
          left(`ID: ${r.id} (${r.berat.toFixed(2)} Kg)`)
        );
      }

      await p.write(left(item.tipe));
      await p.write(lineStruk());
    }
  }

  const calcRollEcer = (items) => {
    let rollQty = 0;
    let rollKg = 0;
    let ecerQty = 0;
    let ecerKg = 0;

    items.forEach((item) => {
      if (item.tipe === "ROL") {
        rollQty += 1;
        rollKg += Number(item.berat || 0);
      } else {
        ecerQty += 1;
        ecerKg += Number(item.berat_jual || item.berat || 0);
      }
    });

    return { rollQty, rollKg, ecerQty, ecerKg };
  };

  const { rollQty, rollKg, ecerQty, ecerKg } =
    calcRollEcer(data.items);

  await p.write(
    right(
      "Total Roll:",
      `${rollQty} Roll (${rollKg.toFixed(2)} Kg)`
    )
  );
  await p.write(
    right(
      "Total Ecer:",
      `${ecerQty} Item (${ecerKg.toFixed(2)} Kg)`
    )
  );
  await p.write(lineStruk());

  const subtotal = Number(data.subtotal) || 0;
  const ongkir = Number(data.ongkir) || 0;
  const potongan = Number(data.potongan) || 0;
  const totalFinal = subtotal + ongkir - potongan;

  await p.write(right("Subtotal:", cleanRp(subtotal)));
  if (ongkir > 0) {
    await p.write(right("Ongkir:", cleanRp(ongkir)));
  }
  if (potongan > 0) {
    await p.write(right("Potongan:", cleanRp(potongan)));
  }

  await p.write(lineStruk());
  await p.write(boldOn);
  await p.write(right("TOTAL:", cleanRp(totalFinal)));
  await p.write(boldOff);
  await p.write(
    right("Metode Pembayaran:", safeText(data.metodePembayaran))
  );
  await p.write(lineStruk());

  await p.write(center("Terima Kasih"));
  await p.write("\n\n\n");
};

export { printStruk };