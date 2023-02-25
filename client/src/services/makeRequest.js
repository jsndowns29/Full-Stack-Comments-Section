import axios from "axios"


//get server url from env file
const api = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL,
   //enables sending authentication cookies to server for user authentication
  withCredentials: true,
})

export function makeRequest(url, options) {
  return api(url, options)
    .then(res => res.data)
    .catch(error => Promise.reject(error?.response?.data?.message ?? "Error"))
}