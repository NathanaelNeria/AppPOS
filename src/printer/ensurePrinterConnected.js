import { reconnectPrinter } from "./reconnectPrinter";

const ensurePrinterConnected = async (
  printerRef,
  setPrinterStatus
) => {
  try {
    if (!printerRef.current) {
      return await reconnectPrinter(printerRef, setPrinterStatus);
    }

    const connected = await printerRef.current.isConnected();
    if (!connected) {
      printerRef.current = null;
      return await reconnectPrinter(printerRef, setPrinterStatus);
    }

    return true;
  } catch {
    printerRef.current = null;
    return false;
  }
};

export { ensurePrinterConnected };
