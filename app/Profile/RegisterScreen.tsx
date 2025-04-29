import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import CheckBox from 'expo-checkbox';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import { StackNavigationProp } from '@react-navigation/stack';

// Define your navigator’s parameter list to include TabNavigator.
type RootStackParamList = {
  TabNavigator: undefined;
  SignUp: undefined;
  // add any other routes here
};

const SignUpScreen = () => {
  // Form state variables
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const { setUser } = useUser();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSelected, setSelection] = useState(false);
  // Allow image state to be a string URI or null.
  const [image, setImage] = useState<string | null>(null);

  // Set up navigation with a properly typed navigator.
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImageToSupabase = async (imageUri: string): Promise<string> => {
    try {
      const fileExt = imageUri.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      // Convert the image URI to a Blob for uploading.
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('profile-images') // Ensure this matches your bucket name
        .upload(`profile_images/${fileName}`, blob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }

      console.log('Upload successful, data:', data);

      // Get the public URL for the uploaded file.
      const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(`profile_images/${fileName}`);

      if (!publicUrlData.publicUrl) {
        throw new Error('Error generating public URL');
      }

      console.log('Public URL:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Image upload failed');
    }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }

    try {
      // Sign up via Supabase Auth.
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.error('Sign-up error:', error);
        throw error;
      }

      // Extract the user from the auth response (ensure your Supabase version returns a user).
      const authUser = data.user;
      
      let profileImageUrl: string | null = null;
      if (image) {
        profileImageUrl = await uploadImageToSupabase(image);
      }

      // Insert user profile information into your "profile" table.
      // Use profileImageUrl ?? '' to guarantee a string value.
      const { error: insertError } = await supabase.from('profile').insert([
        {
          first_name: firstName,
          last_name: lastName,
          username: username,
          email: email,
          profile_image: profileImageUrl ?? '',
        },
      ]);

      if (insertError) {
        console.error('Insert Error:', insertError);
        throw insertError;
      }

      // Update your user context.
      // Here we include the 'id' obtained from authUser to match the expected User type.
      setUser({
        id: authUser?.id ?? '', // Use the authenticated user id (or fallback as appropriate)
        username: username,
        profileImage: profileImageUrl ?? '',
        created_at: new Date().toISOString(),
      });

      Alert.alert('Sign-up successful!');
      // Reset the navigation stack and route to TabNavigator.
      navigation.reset({
        index: 0,
        routes: [{ name: 'TabNavigator' }],
      });
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Sign-up failed', error.message);
      } else {
        Alert.alert('Sign-up failed', 'An unexpected error occurred');
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Sign Up</Text>

      <TouchableOpacity onPress={pickImage}>
        <View style={styles.imageContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <Text style={styles.imagePlaceholder}>Tap to upload picture</Text>
          )}
        </View>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#999"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        placeholderTextColor="#999"
        value={lastName}
        onChangeText={setLastName}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#999"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#999"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <View style={styles.checkboxContainer}>
        <CheckBox value={isSelected} onValueChange={setSelection} />
        <Text style={styles.checkboxLabel}>I agree with privacy and policy</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Already have an account? <Text style={styles.signInText}>Sign In</Text>
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161616',
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingTop: 50,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#262626',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#DB202C',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  checkboxLabel: {
    marginLeft: 10,
    color: '#fff',
  },
  footerText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  signInText: {
    color: '#DB202C',
    fontWeight: 'bold',
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePlaceholder: {
    color: '#999',
  },
});

export default SignUpScreen;
