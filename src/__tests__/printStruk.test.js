const { printStruk } = require("../print/printStruk");
const { createFakePrinter } = require("../test-helper/fakeprinter");


test("printStruk menghitung total dengan benar", async () => {
  const { printerRef, getWrites } = createFakePrinter();

  await printStruk(
    {
      nomorNota: "N-1",
      kasir: "KASIR",
      items: [
        {
          kategori: "A",
          produkNama: "PROD",
          harga_per_kg: 10000,
          tipe: "ROL",
          berat: 2,
          rollId: "R1",
        },
      ],
      subtotal: 20000,
      ongkir: 0,
      potongan: 0,
      metodePembayaran: "CASH",
    },
    {
      printerRef,
      checkPrinterBeforePrint: async () => true,
      reconnectPrinter: async () => true,
    }
  );

  const output = getWrites().join("");

  expect(output).toContain("TOTAL:");
  expect(output).toContain("Rp");
  expect(output).toContain("20.000"); // penting!
});