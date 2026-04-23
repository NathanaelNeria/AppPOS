const handleWebMessage = async (
  event,
  {
    printBarcode,
    printSuratJalanThermal,
    printStruk,
  }
) => {
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

export { handleWebMessage };