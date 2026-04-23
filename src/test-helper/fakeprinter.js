const createFakePrinter = () => {
  const writes = [];

  return {
    printerRef: {
      current: {
        write: async (data) => {
          writes.push(data);
        },
        isConnected: async () => true,
      },
    },
    getWrites: () => writes,
  };
};

module.exports = { createFakePrinter };