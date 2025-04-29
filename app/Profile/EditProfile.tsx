import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Image, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from "../context/UserContext";
import { supabase } from '../supabase/supabaseClient';
import { Feather } from '@expo/vector-icons';

// Define the user profile interface that contains additional properties.
interface UserProfile {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  profileImage: string;
}

// Define the component props with a typed navigation prop.
interface EditProfileProps {
  navigation: any; // Replace 'any' with a more specific type if available.
}

const EditProfile: React.FC<EditProfileProps> = ({ navigation }) => {
  const { user, setUser } = useUser();

  // If there is no user, show a loading state.
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white', textAlign: 'center', marginTop: 20 }}>Loading...</Text>
      </View>
    );
  }

  // Convert user to UserProfile using a double cast. This tells TypeScript
  // to treat the object as having the extended properties.
  const typedUser = user as unknown as UserProfile;

  const [firstName, setFirstName] = useState(typedUser.first_name || '');
  const [lastName, setLastName] = useState(typedUser.last_name || '');
  const [username, setUsername] = useState(typedUser.username || '');
  const [email, setEmail] = useState(typedUser.email || '');
  // Using an empty string as the default value guarantees a string.
  const [localProfileImage, setLocalProfileImage] = useState<string>(typedUser.profileImage || '');
  const [password, setPassword] = useState('••••••••');
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profile')
          .select('*')
          .eq('username', typedUser.username)
          .single();

        if (error) throw error;

        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setUsername(data.username || '');
        setEmail(data.email || '');
        // Fallback to an empty string if profile_image is null.
        setLocalProfileImage(data.profile_image || '');
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching profile:', error);
          Alert.alert('Error fetching profile', error.message);
        }
      }
    };

    if (typedUser.username) {
      fetchProfile();
    }
  }, [typedUser.username]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!pickerResult.canceled) {
      const selectedImage = pickerResult.assets[0].uri;
      setLocalProfileImage(selectedImage);
    }
  };

  const uploadImageToSupabase = async (imageUri: string): Promise<string> => {
    try {
      const fileExt = imageUri.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      // Convert the image URI to a Blob.
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(`profile_images/${fileName}`, blob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // getPublicUrl returns an object with a data property.
      const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(`profile_images/${fileName}`);

      return publicUrlData.publicUrl;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error uploading image:', error);
      }
      throw new Error('Image upload failed');
    }
  };

  const handleSave = async () => {
    try {
      let profileImageUrl = localProfileImage;

      // If the image URI is local (does not start with 'http'), upload it.
      if (localProfileImage && !localProfileImage.startsWith('http')) {
        profileImageUrl = await uploadImageToSupabase(localProfileImage);
      }

      const { error: profileError } = await supabase
        .from('profile')
        .update({
          first_name: firstName,
          last_name: lastName,
          username: username,
          email: email,
          profile_image: profileImageUrl,
        })
        .eq('username', typedUser.username);

      if (profileError) throw profileError;

      // Update the user in context. We cast the object to User (using unknown as needed)
      // to avoid the error that extra properties are not allowed.
      setUser({
        ...typedUser,
        first_name: firstName,
        last_name: lastName,
        username: username,
        email: email,
        profileImage: profileImageUrl || '',
      } as unknown as typeof user);

      Alert.alert('Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error updating profile:', error);
        Alert.alert('Profile update failed', error.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          {localProfileImage ? (
            <Image 
              source={{ uri: localProfileImage }}
              style={styles.profileImage} 
            />
          ) : (
            <View style={[styles.profileImage, styles.defaultAvatar]}>
              <Text style={styles.avatarInitial}>
                {(firstName && firstName[0]) || 'U'}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
            <Feather name="camera" size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
            />
            <View style={styles.checkmarkContainer}>
              <Feather name="check" size={20} color="#4CAF50" />
            </View>
          </View>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
            />
            <View style={styles.checkmarkContainer}>
              <Feather name="check" size={20} color="#4CAF50" />
            </View>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="Email"
            />
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
            />
            <View style={styles.checkmarkContainer}>
              <Feather name="check" size={20} color="#4CAF50" />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#161616",
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultAvatar: {
    backgroundColor: '#E1E1E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#888',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: '38%',
    backgroundColor: '#2196F3',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    paddingRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  checkmarkContainer: {
    padding: 5,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 16,
    marginHorizontal: 16,
    alignItems: 'center',
    marginBottom: 60,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditProfile;
