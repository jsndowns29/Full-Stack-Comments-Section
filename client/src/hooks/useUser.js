//gets user id from cookie using regex 
export function useUser() {
    return { id: document.cookie.match(/userId=(?<id>[^;]+);?$/).groups.id }
}