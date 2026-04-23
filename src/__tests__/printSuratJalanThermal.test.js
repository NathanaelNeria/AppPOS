const { printSuratJalanThermal } = require("../print/printSuratJalanThermal");
const { createFakePrinter } = require("../test-helper/fakeprinter");
const {
  LINE_WIDTH,
  line,
  leftRight,
  centerText,
  wrapText,
} = require("../utils/text");

test("printSuratJalanThermal mencetak header dan item", async () => {
  const { printerRef, getWrites } = createFakePrinter();

  await printSuratJalanThermal(
    {
      sjId: "SJ-001",
      tanggal: "2024-01-01",
      adminPengirim: "ADMIN",
      items: [
        { kategori: "A", produkNama: "PROD1", rollId: "R1", berat: 5 },
      ],
    },
    {
      printerRef,
      checkPrinterBeforePrint: async () => true,
      reconnectPrinter: async () => true,
      LINE_WIDTH,
      line,
      leftRight,
      centerText,
      wrapText,
    }
  );

  const output = getWrites().join("");

  expect(output).toContain("FAJAR TERANG");
  expect(output).toContain("SURAT JALAN");
  expect(output).toContain("PROD1");
  expect(output).toContain("5.00 KG");
});