import axios from "axios";

const API_URL = "http://localhost:5000/api/books";

export const getBooks = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const getBookById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};