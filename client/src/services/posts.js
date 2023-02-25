import { makeRequest } from "./makeRequest.js"

export function getPosts() {
  return makeRequest("/posts")
}

export function getPost(id) {
  return makeRequest(`/posts/${id}`)
}