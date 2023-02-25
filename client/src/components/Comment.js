import React, { useState } from 'react'
import { IconBtn } from './IconBtn'
import { FaHeart, FaRegHeart, FaReply, FaEdit, FaTrash } from 'react-icons/fa'
import { usePost } from '../contexts/PostContext';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';
import { useAsyncFn } from '../hooks/useAsync';
import { createComment, updateComment, deleteComment, toggleCommentLike } from '../services/comments';
import { useUser } from '../hooks/useUser';


//style the date, undefined will automatically style to regional format, ex: US, EU, etc
const dateFormatter = new Intl.DateTimeFormat(undefined, { 
    dateStyle: "medium", 
    timeStyle: "short" 
});

export function Comment({ id, message, user, createdAt, likeCount, likedByMe  }) {
    //get all replies for the comment
    const { 
        post, 
        getReplies, 
        createLocalComment, 
        updateLocalComment, 
        deleteLocalComment,
        toggleLocalCommentLike 
    } = usePost();

    const childComments = getReplies(id);
    const [areChildrenHidden, setAreChildrenHidden] = useState(true);
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const currentUser = useUser();

    //return async function for calling api to create comment, use fn version b/c only call on submit, no need for useEffect
    const createCommentFn = useAsyncFn(createComment);
    const updateCommentFn = useAsyncFn(updateComment);
    const deleteCommentFn = useAsyncFn(deleteComment);
    const toggleCommentLikeFn = useAsyncFn(toggleCommentLike);

    function onCommentReply(message){
        return createCommentFn.execute({postId: post.id, message, parentId: id}).then(comment => {
            setIsReplying(false);
            createLocalComment(comment);
        });
    }

    function onCommentUpdate(message){
        return updateCommentFn.execute({postId: post.id, message, id}).then(comment => {
            setIsEditing(false);
            updateLocalComment(id, comment.message);
        });
    }

    function onCommentDelete(){
        return deleteCommentFn.execute({postId: post.id, id}).then(comment => {
            deleteLocalComment(comment.id);
        });
    }

    function onToggleCommentLike(message){
        return toggleCommentLikeFn.execute({postId: post.id, id}).then(({addLike}) => {
            toggleLocalCommentLike(id, addLike);
        });
    }

    return <>
        <div className="comment"> 
            <div className="header">
                <span className="name">{user.name}</span>
                <span className="date">{dateFormatter.format(Date.parse(createdAt))}</span>
            </div>
            {isEditing ? (
                <div className="mt-1 ml-3">
                    <CommentForm 
                        autoFocus 
                        onSubmit={onCommentUpdate} 
                        initialValue={message}
                        loading={updateCommentFn.loading} 
                        error={updateCommentFn.error}
                    />
                </div>
            ) : (
                <div className="message">{message}</div>
            )}
            
            <div className="footer">
                <IconBtn
                    onClick={() => onToggleCommentLike()} 
                    disabled={toggleCommentLikeFn.loading}
                    Icon={likedByMe ? FaHeart: FaRegHeart} 
                    aria-label={likedByMe ? "Unlike" : "Like"}
                >
                        {likeCount}
                </IconBtn>
                <IconBtn 
                    onClick={() => setIsReplying(prev => !prev)}
                    isActive={isReplying} 
                    Icon={FaReply} 
                    aria-label={isReplying ? "Cancel Reply" : "Reply"}
                />
                {currentUser.id === user.id && (
                    <>
                        <IconBtn
                            onClick={() => setIsEditing(prev => !prev)}
                            isActive={isEditing} 
                            Icon={FaEdit} 
                            aria-label="Edit" 
                        />
                        <IconBtn 
                            onClick={() => onCommentDelete()}
                            disabled={deleteCommentFn.loading}
                            Icon={FaTrash} 
                            aria-label="Delete" 
                            color="danger" 
                        />
                    </>
                )}
               
                    
                {deleteCommentFn.error && (
                    <div className="error-msg mt-1">{deleteCommentFn.error}</div>
                )}
            </div>
        </div>

        {isReplying && (
            <div className="mt-1 ml-3">
                <CommentForm 
                    autoFocus 
                    onSubmit={onCommentReply} 
                    loading={createCommentFn.loading} 
                    error={createCommentFn.error}
                />
            </div>
        )}

        {childComments?.length > 0 && (
            <>
                <div className={`nested-comments-stack ${areChildrenHidden ? 'hide' : ''}`}>
                    <button className="collapse-line" aria-label="Hide Replies" 
                    onClick={()=>setAreChildrenHidden(true)} />
                    <div className="nested-comments">
                        <CommentList comments={childComments}/>
                    </div>
                </div>
                <button 
                className={`btn mt-1 ${!areChildrenHidden ? 'hide' : ''}`} 
                onClick={()=>setAreChildrenHidden(false)}>
                    Show Replies
                </button>
            </>
        )}
    </>
}
