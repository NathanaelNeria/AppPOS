import RNBluetoothClassic from "react-native-bluetooth-classic";
import { delay } from "../utils/delay";
import { requestBluetoothPermission } from "../permissions/requestBluetoothPermission";
import { safeDisconnect } from "./safeDisconnect";

const connectPrinter = async (
  printerRef,
  setPrinterStatus
) => {
  try {
    setPrinterStatus("checking");
    await requestBluetoothPermission();

    const devices = await RNBluetoothClassic.getBondedDevices();
    const printer = devices.find(d =>
      d.name?.toLowerCase().startsWith("rpp02n")
    );

    if (!printer) {
      setPrinterStatus("disconnected");
      return;
    }

    await safeDisconnect(printerRef, setPrinterStatus);
    await delay(3000);

    await printer.connect();
    const real = await printer.isConnected();
    if (!real) throw new Error("Not really connected");

    printerRef.current = printer;
    global.printerAddress = printer.address;

    setPrinterStatus("connected");
  } catch (e) {
    printerRef.current = null;
    setPrinterStatus("disconnected");
  }
};

export { connectPrinter };