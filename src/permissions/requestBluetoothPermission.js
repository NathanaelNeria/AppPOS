import { PermissionsAndroid, Platform } from "react-native";

const requestBluetoothPermission = async () => {
  if (Platform.OS === "android" && Platform.Version >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    ]);
    console.log("PERMISSIONS:", granted);
  }
};

export { requestBluetoothPermission };