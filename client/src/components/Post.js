import React from 'react'
import { usePost } from '../contexts/PostContext';
import {CommentList} from './CommentList';
import { CommentForm } from './CommentForm';
import { useAsyncFn } from '../hooks/useAsync';
import { createComment } from '../services/comments';

export function Post() {

    //get data passed from context provider by importing specific variables
    const { post, rootComments, createLocalComment } = usePost();

    //return async function for calling api to create comment, use fn version b/c only call on submit, no need for useEffect
    const { loading, error, execute: createCommentFn } = useAsyncFn(createComment);

    function onCommentCreate(message){
        return createCommentFn({postId: post.id, message}).then(comment => {
            createLocalComment(comment)
        });
    }

    return (
        <div>
          <h1>{post.title}</h1> 
          <article>{post.body}</article>
          <h3 className="comments-title">Comments</h3>
          <section>
              <CommentForm 
                loading={loading} 
                error={error} 
                onSubmit={onCommentCreate} 
              />
              {rootComments != null && rootComments.length > 0 && (
                  <div className="mt-4">
                    <CommentList comments={rootComments}/>
                  </div>
              )}
          </section>
        </div>
    )
}
