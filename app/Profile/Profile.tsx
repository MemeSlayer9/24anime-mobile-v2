import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import {
  useNavigation,
  NavigationProp,
  useFocusEffect
} from "@react-navigation/native";
import { useUser } from "../context/UserContext";

// Update the type definition to include all the routes you're navigating to
type RootStackParamList = {
  Login: undefined;
  EditProfile: undefined;
  History: undefined;
  MyPlaylist: undefined;
  Settings: undefined; // Added this in case you implement navigation to this later
};

const ProfileScreen = () => {
  const { user, logout } = useUser();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // This useFocusEffect ensures that every time the screen is focused,
  // it reflects the latest user data. If you need to fetch fresh data,
  // you can add your refresh logic here.
  useFocusEffect(
    React.useCallback(() => {
      console.log("ProfileScreen focused. Current user:", user);
      // You can trigger additional refreshing logic here if needed.
    }, [user])
  );

  const handleLoginPress = () => {
    navigation.navigate("Login");
  };

  const handleEditProfilePress = () => {
    navigation.navigate("EditProfile");
  };

  const handleLogoutPress = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Format the created_at date if available
  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : "N/A";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {user ? (
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: user.profileImage || "https://i.pinimg.com/736x/ce/35/27/ce3527280aa163522b47c38519f9f522.jpg" }}
                style={styles.avatar}
              />
            </View>
            <Text style={styles.userName}>{user.username || "User"}</Text>
            <Text style={styles.userSince}>Active since · {formattedDate}</Text>
            {/* Edit Profile Button */}
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={handleEditProfilePress}
            >
              <Feather name="edit-2" size={16} color="white" style={styles.editIcon} />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.loginPromptContainer}>
            <Text style={styles.loginPromptText}>
              Please log in to view your profile
            </Text>
            <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Utilities Section - Always visible */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Utilities</Text>

         <TouchableOpacity
          style={[styles.utilityItem, !user && styles.disabled]}
          disabled={!user}
          onPress={() => {
            if (user) {
              navigation.navigate('History');
            }
          }}
        >
          <View style={styles.utilityLeftSection}>
            <View style={[styles.utilityIconContainer, { backgroundColor: "#202030" }]}>
              <Feather name="list" size={18} color="#9370DB" />
            </View>
            <Text style={styles.utilityText}>History</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

         <TouchableOpacity
          style={[styles.utilityItem, !user && styles.disabled]}
          disabled={!user}
          onPress={() => {
            if (user) {
              navigation.navigate('MyPlaylist');
            }
          }}
        >
          <View style={styles.utilityLeftSection}>
            <View style={[styles.utilityIconContainer, { backgroundColor: "#202030" }]}>
              <Feather name="bar-chart-2" size={18} color="#9370DB" />
            </View>
            <Text style={styles.utilityText}>My Playlist</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>


          <TouchableOpacity
            style={[styles.utilityItem, !user && styles.disabled]}
            disabled={!user}
            onPress={() => {
              if (user) {
                // Navigate to Settings if you implement this screen
                // navigation.navigate('Settings');
              }
            }}
          >
            <View style={styles.utilityLeftSection}>
              <View style={[styles.utilityIconContainer, { backgroundColor: "#1a2030" }]}>
                <Feather name="message-circle" size={18} color="#6495ED" />
              </View>
              <Text style={styles.utilityText}>Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {user ? (
            <TouchableOpacity style={styles.utilityItem} onPress={handleLogoutPress}>
              <View style={styles.utilityLeftSection}>
                <View style={[styles.utilityIconContainer, { backgroundColor: "#201020" }]}>
                  <Feather name="log-out" size={18} color="#DA70D6" />
                </View>
                <Text style={styles.utilityText}>Log-Out</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.utilityItem} onPress={handleLoginPress}>
              <View style={styles.utilityLeftSection}>
                <View style={[styles.utilityIconContainer, { backgroundColor: "#201020" }]}>
                  <Feather name="log-in" size={18} color="#DA70D6" />
                </View>
                <Text style={styles.utilityText}>Log-In</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#161616",
  },
  profileSection: {
    alignItems: "center",
    paddingTop: 15,
    paddingBottom: 30,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#FF1493",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  userSince: {
    fontSize: 14,
    color: "#999",
    marginBottom: 15,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF1493",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 5,
  },
  editIcon: {
    marginRight: 5,
  },
  editProfileText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  loginPromptContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  loginPromptText: {
    fontSize: 18,
    color: "white",
    textAlign: "center",
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: "#DB202C",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionContainer: {
    backgroundColor: "#161625",
    borderRadius: 15,
    margin: 15,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  utilityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#252535",
  },
  utilityLeftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  utilityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  utilityText: {
    fontSize: 16,
    color: "white",
  },
  disabled: {
    opacity: 0.5, // Adjust the opacity as needed
  },
});

export default ProfileScreen;