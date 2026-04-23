const { printBarcode } = require("../print/printBarcode");
const { createFakePrinter } = require("../test-helper/fakeprinter");

test("printBarcode mengirim ESC/POS barcode dengan urutan benar", async () => {
  const { printerRef, getWrites } = createFakePrinter();

  const checkPrinterBeforePrint = async () => true;
  const reconnectPrinter = async () => true;

  await printBarcode(
    "ABC123",
    "10",
    "PRODUK A",
    "KAT",
    {
      printerRef,
      checkPrinterBeforePrint,
      reconnectPrinter,
    }
  );

  const writes = getWrites();

  expect(writes[0]).toBe("\x1B\x40"); // reset
  expect(writes).toContain("\x1B\x61\x01"); // center
  expect(writes.join("")).toContain("KAT-PRODUK A");
  expect(writes.join("")).toContain("ABC123");
  expect(writes.join("")).toContain("10 KG");
});