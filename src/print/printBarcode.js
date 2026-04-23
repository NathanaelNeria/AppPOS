const printBarcode = async (
  barcode,
  berat,
  produkNama,
  kategori,
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

  await p.write("\x1B\x40"); // reset printer
  await p.write("\x1B\x61\x01"); // center align
  await p.write("\x1D\x48\x00"); // angka di bawah barcode
  await p.write("\x1D\x77\x02"); // width
  await p.write("\x1D\x68\x90"); // height

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

export { printBarcode };