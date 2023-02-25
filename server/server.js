import fastify from 'fastify';
import dotenv from "dotenv";
import {PrismaClient} from "@prisma/client";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie"

//uses info in .env for server port and database
dotenv.config();

//fastify backend framework
const app = fastify();
app.register(sensible);
app.register(cors, {
    origin: process.env.CLIENT_URL,
    credentials: true
});
app.register(cookie, { secret: process.env.COOKIE_SECRET });

//every time make request, set cookie on browser to current user
app.addHook("onRequest", (req, res, done) => {
    if (req.cookies.userId !== CURRENT_USER_ID) {
      req.cookies.userId = CURRENT_USER_ID
      res.clearCookie("userId")
      res.setCookie("userId", CURRENT_USER_ID)
    }
    done()
})

//init prisma client
const prisma = new PrismaClient();

//fake login, specify current user
const CURRENT_USER_ID = (
    await prisma.user.findFirst({ where: { name: "Kyle" } })
).id

const COMMENT_SELECT_FIELDS = {
    id: true,
    message: true,
    parentId: true,
    createdAt: true,
    user:{
        select: {
            id: true,
            name: true,
        }  
   }
}

//return all posts where id and title exist
app.get("/posts", async (req, res) => {
    
    return await commitToDb( 
        prisma.post.findMany({
            select: {
            id: true,
            title: true,
            }
        })
    )
})

//return post with specific id 
app.get("/posts/:id", async (req, res) => {
    
    return await commitToDb( 
        prisma.post.findUnique({
           where: { id: req.params.id },
           select:{
               body: true,
               title: true,
               comments:{
                   orderBy: {
                       createdAt: "desc"
                   },
                   select: {
                       ...COMMENT_SELECT_FIELDS,
                       //get likes count on comments
                       _count: {
                           select: {
                               likes: true
                           }
                       }
                    }
               }
           }
        }).then(async post => {
            //get likes for signed in user for comments on this post
            const likes = await prisma.like.findMany({
                where:{
                    userId: req.cookies.userId,
                    //comment id is in list of comments in post
                    commentId: {in: post.comments.map(comment => comment.id)}
                }
            })

            return {
                //return post
                ...post,
               
                comments: post.comments.map(comment => {
                    const {_count, ...commentFields} = comment
                    return{
                        ...commentFields,
                         //add like info to comment
                        likedByMe: likes.find(like => like.commentId === comment.id),
                        likeCount: _count.likes
                    }
                })
            }
        })
    )
})

//post a comment
app.post("/posts/:id/comments", async (req, res) => {
    if(req.body.message === "" || req.body.message ==null){
        return res.send(app.httpErrors.badRequest("Message is required"));
    }

    return await commitToDb(
        prisma.comment.create({
            data: {
                message: req.body.message,
                userId: req.cookies.userId,
                parentId: req.body.parentId,
                postId: req.params.id
            },
            select: COMMENT_SELECT_FIELDS,
        }).then(comment => {
            return {
                //add initial like settings on comment post
                ...comment,
                likeCount: 0,
                likedByMe: false
            }
        })
    )
})

//update a comment
app.put("/posts/:postId/comments/:commentId", async (req, res) => {
    if(req.body.message === "" || req.body.message ==null){
        return res.send(app.httpErrors.badRequest("Message is required"));
    }

    const { userId } = await prisma.comment.findUnique({
        where: { id: req.params.commentId },
        select: { userId: true },
      })
    if (userId !== req.cookies.userId) {
        return res.send(
          app.httpErrors.unauthorized(
            "You do not have permission to edit this message"
          )
        )
      }

    return await commitToDb(
        prisma.comment.update({
          where: { id: req.params.commentId },
          data: { message: req.body.message },
          select: { message: true },
        })
    )
})

//delete a comment
app.delete("/posts/:postId/comments/:commentId", async (req, res) => {

    const { userId } = await prisma.comment.findUnique({
        where: { id: req.params.commentId },
        select: { userId: true },
      })
    if (userId !== req.cookies.userId) {
        return res.send(
          app.httpErrors.unauthorized(
            "You do not have permission to delete this message"
          )
        )
      }

    return await commitToDb(
        prisma.comment.delete({
          where: { id: req.params.commentId },
          select: {id: true}
        })
    )
})

//like a comment
app.post("/posts/:postId/comments/:commentId/toggleLike", async (req, res) => {

    const data = {
        commentId: req.params.commentId,
        userId: req.cookies.userId
    } 

    const like = await prisma.like.findUnique({
      where: { userId_commentId: data }
    })

    if(like == null){
        return await commitToDb(
            prisma.like.create({data})
        ).then(() => {
            return { addLike: true }
        })  
    }else{
        return await commitToDb(
            prisma.like.delete({ where: { userId_commentId: data } })
        ).then(() => {
            return { addLike: false }
        })  
    }

})


//error handling function
//if error, return error, if result return result
//use sensible app.to() to handle
async function commitToDb(promise) {
    const [error, data] = await app.to(promise)
    if (error) return app.httpErrors.internalServerError(error.message)
    return data
  }
  


app.listen({ port : process.env.PORT });

