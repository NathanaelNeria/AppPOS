import RNBluetoothClassic from "react-native-bluetooth-classic";
import { delay } from "../utils/delay";
import { safeDisconnect } from "./safeDisconnect";

const reconnectPrinter = async (
  printerRef,
  setPrinterStatus
) => {
  try {
    if (!global.printerAddress) {
      setPrinterStatus("disconnected");
      return false;
    }

    setPrinterStatus("checking");

    await safeDisconnect(printerRef, setPrinterStatus);
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

export { reconnectPrinter };