import axios from "axios";

const API_URL = "https://bookstore-management-web-applications.onrender.com/api/books";

export const getBooks = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const getBookById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};