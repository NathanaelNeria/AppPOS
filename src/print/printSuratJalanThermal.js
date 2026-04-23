const printSuratJalanThermal = async (
  data,
  {
    printerRef,
    checkPrinterBeforePrint,
    reconnectPrinter,
    LINE_WIDTH,
    line,
    leftRight,
    centerText,
    wrapText,
  }
) => {

  const twoColumn = (left, right) => {
    let space = LINE_WIDTH - left.length - right.length;
    if (space < 1) space = 1;
    return left + " ".repeat(space) + right + "\n";
  };

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
  await p.write(centerText("Ruko Auri, Jl. Anggrek IV Blok AA No.17"));
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
  await p.write(`No : ${data.sjId}\n`);
  await p.write(`Tgl : ${data.tanggal}\n`);

  if (data.mode === "CUSTOMER") {
    await p.write(`Kpd : ${data.customerNama}\n`);
  } else {
    await p.write(`Dari : ${data.gudangAsal}\n`);
    await p.write(`Ke : ${data.gudangTujuan}\n`);
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
      berat: Number(item.berat) || 0,
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

      await p.write("\x1D\x21\x00");

      await p.write("\x1B\x45\x01");
      await p.write(leftRight(" " + produk.toUpperCase(), String(rolls.length)));

      for (let r of rolls) {
        await p.write(
          leftRight(
            " " + r.rollId,
            `${r.berat.toFixed(2)} KG`
          )
        );
      }

      await p.write("\x1B\x45\x00");
      await p.write("\x1D\x21\x00");
    }
  }

  await p.write("\x1B\x61\x01");
  await p.write(line());
  await p.write("\x1B\x61\x00");

  await p.write(right("Total Roll:", data.items.length + " Roll"));

  // ================= TOTAL =================
  await p.write("\x1D\x21\x10");
  await p.write("\n");

  if (data.mode !== "CUSTOMER") {
    await p.write(
      centerText(`${data.gudangAsal} -> ${data.gudangTujuan}`)
    );
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
  await p.write(twoColumn("Pengirim,", "Penerima,"));
  await p.write(twoColumn(" ", " "));
  await p.write(twoColumn(" ", " "));
  await p.write(twoColumn(" ", " "));

  await p.write(
    twoColumn(`(${data.adminPengirim})`, " ")
  );

  await p.write("\n");
  await p.write("Via: " + viaName + "\n");
  await p.write("\n");

  // ================= FOOTER =================
  await p.write("\n");
  await p.write(centerText(data.sjId));
  await p.write("\n\n\n\n");
};

export { printSuratJalanThermal };