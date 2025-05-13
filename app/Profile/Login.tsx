import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import CheckBox from 'expo-checkbox';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase/supabaseClient';
import { useUser } from '../context/UserContext';

type RootStackParamList = {
  TabNavigator: undefined;
  Login: undefined;
  Register: undefined;
  Profile: undefined;
  Tabs: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { setUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    // Check if user is already logged in via AsyncStorage
    const checkLoggedIn = async () => {
      const storedEmail = await AsyncStorage.getItem('@user_email');
      if (storedEmail) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Tabs' }],
        });
      }
    };

    checkLoggedIn();
  }, [navigation]);

  const handleLogin = async () => {
    try {
      // Authenticate user using Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        Alert.alert('Login Error', error.message);
        return;
      }

      // Fetch user profile from your 'profile' table, including created_at
      const { data: profileData, error: profileError } = await supabase
        .from('profile')
        .select('username, profile_image, created_at')
        .eq('email', email)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        Alert.alert('Error', 'Could not fetch profile.');
        return;
      }

      if (!profileData || !profileData.username) {
        Alert.alert('Error', 'Username not found.');
        return;
      }

      // Extract profile values
      const username = profileData.username;
      const profileImage = profileData.profile_image;
      const created_at = profileData.created_at;

      // Update the user context with created_at included
      setUser({
        id: data.user?.id || '',
        username: username,
        profileImage: profileImage,
        created_at: created_at,
      });

      // Store email in AsyncStorage if "Remember Me" is checked
      if (rememberMe) {
        await AsyncStorage.setItem('@user_email', email);
      }

      Alert.alert('Login Successful', `Welcome, ${username}`);

      // Reset navigation stack and navigate to TabNavigator
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs' }],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Login error:', error);
      Alert.alert('An error occurred', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#BBBBBB"
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#BBBBBB"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Text style={styles.showPasswordText}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.optionsContainer}>
        <View style={styles.checkboxContainer}>
          <CheckBox
            value={rememberMe}
            onValueChange={setRememberMe}
            color={rememberMe ? '#BB2B4A' : undefined}
          />
          <Text style={styles.rememberMeText}>Remember me</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.forgotPasswordText}>Forgot Password</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Log in</Text>
      </TouchableOpacity>

      <Text style={styles.orSignInText}>Or Sign in with</Text>
      <View style={styles.socialContainer}>
        <TouchableOpacity style={styles.socialButton}>
          <Icon name="facebook" size={30} color="#4267B2" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Icon name="google" size={30} color="#DB4437" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.signUpText}>
          Don't have an account? <Text style={styles.signUpLink}>Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161616',
    padding: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#262626',
    borderRadius: 10,
    padding: 15,
    color: '#FFFFFF',
    marginBottom: 15,
    borderColor: '#DB202C',
    borderWidth: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 10,
    padding: 15,
    borderColor: '#DB202C',
    borderWidth: 1,
  },
  passwordInput: {
    color: '#FFFFFF',
    flex: 1,
  },
  showPasswordText: {
    color: '#DB202C',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    color: '#BBBBBB',
    marginLeft: 8,
  },
  forgotPasswordText: {
    color: '#DB202C',
  },
  loginButton: {
    backgroundColor: '#DB202C',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orSignInText: {
    color: '#BBBBBB',
    textAlign: 'center',
    marginBottom: 20,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  socialButton: {
    backgroundColor: '#262626',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBBBBB',
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    color: '#BBBBBB',
    textAlign: 'center',
  },
  signUpLink: {
    color: '#DB202C',
  },
});

export default LoginScreen;
