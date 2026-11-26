import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

const debuggerHost = Constants.expoConfig?.hostUri;
const localhost = debuggerHost?.split(":").shift();

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ||
  (localhost
    ? `http://${localhost}:3000/api`
    : "http://127.0.0.1:3000/api");

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("userToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
