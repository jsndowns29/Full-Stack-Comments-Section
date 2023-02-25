import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync';
import { getPost } from '../services/posts';

const Context = React.createContext();

//export context so that children can use it to get provider data
export function usePost(){
    return useContext(Context);
}

//use provider to pass data to all child components without using props
export function PostProvider({ children }){

    //get post id from url
    const { id } = useParams(); 
    //get post data
    const {loading, error, value: post} = useAsync(() => getPost(id), [id]);

    const [comments, setComments] = useState([]);

    //order comments by parent id for ease of rendering, memo (cache rsult) and update on comments change
    const commentsByParentId = useMemo(() => {
        if(comments == null) return [];
        //example group = {parentId1 : [comment2, comment 3], parentId2: [comment3, comment 4]}
        const group = {};
        comments.forEach(comment => {
            //use object indexing, if index not exist, add empty array at index;
            group[comment.parentId] ||= []; 
            //add comment at parent id index in object
            group[comment.parentId].push(comment);
        });

        return group;
    }, [comments]); 

    //as soon as we load post, take all comments from post and put into comments variable
    useEffect(() => {
        if(post?.comments == null) return;
        setComments(post.comments);
    }, [post?.comments])
    
    //get replies by providing parent comment id
    const getReplies = (parentId) => {
        return commentsByParentId[parentId];
    }

    //update comments locally after posting so that the page doen't need to reload to display new comment
    function createLocalComment(comment){
        setComments(prevComments => {
            return [comment, ...prevComments]
        });
    }

    function updateLocalComment(id, message) {
        setComments(prevComments => {
          return prevComments.map(comment => {
            if (comment.id === id) {
              return { ...comment, message }
            } else {
              return comment
            }
          })
        })
    }

    function deleteLocalComment(id) {
        setComments(prevComments => {
          return prevComments.filter(comment => comment.id !== id)
        })
    }

    function toggleLocalCommentLike(id, addLike) {
        setComments(prevComments => {
            return prevComments.map(comment => {
                if(id === comment.id){
                    if(addLike){
                        return{
                            ...comment,
                            likeCount: comment.likeCount + 1,
                            likedByMe: true
                        }
                    }else{
                        return{
                            ...comment,
                            likeCount: comment.likeCount - 1,
                            likedByMe: false
                        }
                    }

                }else{
                    return comment
                }
            })
        })
    }


    // render either children, loading or error
    return <Context.Provider value={{
        post: {id, ...post},
        getReplies,
        rootComments: commentsByParentId[null],
        createLocalComment,
        updateLocalComment,
        deleteLocalComment,
        toggleLocalCommentLike
    }}>
        {loading ? (
            <h1>Loading</h1> 
        ) : error ? (
            <h1 className="error-msg">Error</h1> 
        ) : (
            children 
        )}
        
    </Context.Provider>
}