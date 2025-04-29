 import { StatusBar } from "react-native";
 import StackNavigator from "./navigation/StackNavigator";

export default function RootLayout() {
 
  return (
    <>
      {/* Set status bar background to white with dark icons */}
      <StatusBar backgroundColor="#161616" barStyle="light-content" />
      <StackNavigator />
    </>
  );
}
