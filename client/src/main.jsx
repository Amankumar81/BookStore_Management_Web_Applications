// 
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";

import App from "./App";
import { store } from "./store/store";

import "react-toastify/dist/ReactToastify.css";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <ToastContainer
         position="top-right"
         autoClose={1000}
         hideProgressBar={true}
         closeOnClick
         pauseOnHover
        />
      </BrowserRouter>
    </Provider>
  </StrictMode>
);