import express from "express"

const app=express();

app.use(express.json())

app.get("/health",(req,res)=>{
    return res.status(200).json({
        Message:"Health check success"
    })
})

export default app;