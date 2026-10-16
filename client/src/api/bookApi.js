import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/books`;

export const getBooks = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const getBookById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};