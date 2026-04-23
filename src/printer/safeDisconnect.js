const safeDisconnect = async (printerRef, setPrinterStatus) => {
  try {
    if (printerRef.current) {
      const connected = await printerRef.current.isConnected();
      if (connected) {
        await printerRef.current.disconnect();
      }
    }
  } catch {}
  finally {
    printerRef.current = null;
    setPrinterStatus("disconnected");
  }
};

export { safeDisconnect };